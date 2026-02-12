import { IsEnum, IsEmail, IsPhoneNumber, IsNumber, Min, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrencyType, PaymentMethodType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 'PAY001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 1000.00 })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: CurrencyType, example: CurrencyType.UGX })
  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.MOBILE_MONEY })
  @IsEnum(PaymentMethodType)
  payment_method: PaymentMethodType;

  @ApiProperty({ example: '+256700000001' })
  @IsPhoneNumber()
  customer_phone: string;

  @ApiProperty({ example: 'customer@opareta.com' })
  @IsEmail()
  customer_email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}