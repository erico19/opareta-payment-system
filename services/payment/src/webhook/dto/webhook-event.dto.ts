import { IsEnum, IsString, IsISO8601, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../../payment/entities/payment.entity';

export class WebhookEventDto {
  @ApiProperty({ example: 'OP123456' })
  @IsString()
  payment_reference: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.SUCCESS })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({ example: 'prov_txn_123456' })
  @IsString()
  provider_transaction_id: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsISO8601()
  timestamp: string;

  @ApiProperty({ example: 'idempotency_key_123456' })
  @IsString()
  idempotency_key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  payload?: any;
}