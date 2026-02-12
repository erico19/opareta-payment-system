import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { PaymentService } from '../payment/payment.service';
import { Payment } from '../payment/entities/payment.entity';
import { WebhookEvent } from '../payment/entities/webhook-event.entity';
import { PaymentAuditLog } from '../payment/entities/payment-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, WebhookEvent, PaymentAuditLog]),
  ],
  controllers: [WebhookController],
  providers: [PaymentService],
})
export class WebhookModule {}