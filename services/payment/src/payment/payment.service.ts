import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus, CurrencyType, PaymentMethodType } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Counter, register } from 'prom-client';

@Injectable()
export class PaymentService {
  private readonly paymentStatusCounter: Counter<string>;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(WebhookEvent)
    private webhookEventsRepository: Repository<WebhookEvent>,
    @InjectRepository(PaymentAuditLog)
    private auditLogRepository: Repository<PaymentAuditLog>,
  ) {
    const existing = (register as any).getSingleMetric?.('payments_status_total') as Counter<string> | undefined;
    this.paymentStatusCounter =
      existing ||
      new Counter({
        name: 'payments_status_total',
        help: 'Count of payments by status changes',
        labelNames: ['status'],
      });
  }

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const reference = this.generatePaymentReference();
    
    const payment = this.paymentsRepository.create({
      ...createPaymentDto,
      reference,
      status: PaymentStatus.INITIATED,
    });

    await this.paymentsRepository.save(payment);

    // Log the initial state
    await this.logPaymentStatusChange(
      payment.reference,
      null,
      PaymentStatus.INITIATED,
      'Payment initiated'
    );

    this.paymentStatusCounter.labels(PaymentStatus.INITIATED).inc();

    // Simulate sending to payment provider
    await this.simulateProviderSubmission(payment);

    return payment;
  }

  async findPaymentByReference(reference: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with reference ${reference} not found`);
    }

    return payment;
  }

  async findAllPayments(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findPaymentsByUserEmail(email: string): Promise<Payment[]> {
    if (!email) {
      throw new Error('User email is required');
    }
    return this.paymentsRepository.find({
      where: { customer_email: email },
      order: { created_at: 'DESC' },
    });
  }

  async updatePaymentStatus(
    reference: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.findPaymentByReference(reference);
    
    const oldStatus = payment.status;
    const newStatus = updatePaymentStatusDto.status;

    // Validate state transition
    if (!this.isValidStateTransition(oldStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid state transition from ${oldStatus} to ${newStatus}`
      );
    }

    // Update payment
    payment.status = newStatus;
    if (updatePaymentStatusDto.provider_transaction_id) {
      payment.provider_transaction_id = updatePaymentStatusDto.provider_transaction_id;
    }

    await this.paymentsRepository.save(payment);

    // Log the status change
    await this.logPaymentStatusChange(
      reference,
      oldStatus,
      newStatus,
      updatePaymentStatusDto.reason || 'Status updated manually'
    );

    this.paymentStatusCounter.labels(newStatus).inc();

    return payment;
  }

  async processWebhook(
    paymentReference: string,
    status: PaymentStatus,
    providerId: string,
    idempotencyKey: string,
    eventTimestamp: Date,
    payload?: any,
  ): Promise<Payment> {
    // Check for duplicate webhook using idempotency key
    const existingEvent = await this.webhookEventsRepository.findOne({
      where: { idempotency_key: idempotencyKey },
    });

    if (existingEvent) {
      return this.findPaymentByReference(paymentReference);
    }

    // Store webhook event for idempotency
    const webhookEvent = this.webhookEventsRepository.create({
      payment_reference: paymentReference,
      provider_id: providerId,
      status,
      event_timestamp: eventTimestamp,
      idempotency_key: idempotencyKey,
      payload,
    });

    await this.webhookEventsRepository.save(webhookEvent);

    // Update payment status
    const payment = await this.findPaymentByReference(paymentReference);
    const oldStatus = payment.status;

    if (this.isValidStateTransition(oldStatus, status)) {
      payment.status = status;
      payment.provider_transaction_id = providerId;
      await this.paymentsRepository.save(payment);

      await this.logPaymentStatusChange(
        paymentReference,
        oldStatus,
        status,
        `Webhook processed - ${providerId}`
      );

      this.paymentStatusCounter.labels(status).inc();
    }

    return payment;
  }

  private generatePaymentReference(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `OP${timestamp}${random}`;
  }

  private isValidStateTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.INITIATED]: [PaymentStatus.PENDING],
      [PaymentStatus.PENDING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED],
      [PaymentStatus.SUCCESS]: [],
      [PaymentStatus.FAILED]: [],
    };

    return validTransitions[from].includes(to);
  }

  private async logPaymentStatusChange(
    reference: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
    reason: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      payment_reference: reference,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
    });

    await this.auditLogRepository.save(auditLog);
  }

  private async simulateProviderSubmission(payment: Payment): Promise<void> {
    // Simulate API call to payment provider
    setTimeout(async () => {
      try {
        payment.status = PaymentStatus.PENDING;
        await this.paymentsRepository.save(payment);

        await this.logPaymentStatusChange(
          payment.reference,
          PaymentStatus.INITIATED,
          PaymentStatus.PENDING,
          'Sent to payment provider'
        );

        // Simulate provider callback after random delay
        const delay = Math.random() * 10000 + 5000; // 5-15 seconds
        setTimeout(async () => {
          const finalStatus = Math.random() > 0.3 ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
          
          await this.updatePaymentStatus(payment.reference, {
            status: finalStatus,
            provider_transaction_id: `PROV${Date.now()}`,
            reason: `Simulated provider response - ${finalStatus}`,
          });
        }, delay);
      } catch (error) {
        console.error('Error in provider simulation:', error);
      }
    }, 1000);
  }
}