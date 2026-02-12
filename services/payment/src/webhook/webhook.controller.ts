import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaymentService } from '../payment/payment.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { Payment } from '../payment/entities/payment.entity';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment webhook from provider' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @ApiResponse({ status: 409, description: 'Duplicate webhook' })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'Webhook signature for verification',
    required: false,
  })
  async handlePaymentWebhook(
    @Body() webhookEventDto: WebhookEventDto,
    @Headers('x-webhook-signature') signature: string,
  ): Promise<{ success: boolean; payment: Payment }> {
    // In production, verify the webhook signature here
    if (signature) {
      // Add signature verification logic
      console.log('Webhook signature:', signature);
    }

    const payment = await this.paymentService.processWebhook(
      webhookEventDto.payment_reference,
      webhookEventDto.status,
      webhookEventDto.provider_transaction_id,
      webhookEventDto.idempotency_key,
      new Date(webhookEventDto.timestamp),
      webhookEventDto.payload,
    );

    return { success: true, payment };
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate provider webhook (for testing)' })
  @ApiResponse({ status: 200, description: 'Webhook simulation processed' })
  async simulateWebhook(
    @Body() webhookEventDto: WebhookEventDto,
  ): Promise<{ success: boolean; payment: Payment }> {
    const payment = await this.paymentService.processWebhook(
      webhookEventDto.payment_reference,
      webhookEventDto.status,
      webhookEventDto.provider_transaction_id,
      webhookEventDto.idempotency_key,
      new Date(webhookEventDto.timestamp),
      webhookEventDto.payload,
    );

    return { success: true, payment };
  }
}