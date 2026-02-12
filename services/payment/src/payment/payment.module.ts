import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { PaymentAuditLog } from './entities/payment-audit-log.entity';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy'; // Make sure this is here

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, WebhookEvent, PaymentAuditLog]),
    HttpModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, AuthService, JwtStrategy], // And here
  exports: [PaymentService],
})
export class PaymentModule {}