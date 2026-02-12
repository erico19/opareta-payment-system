import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED'
}

export enum CurrencyType {
  UGX = 'UGX',
  USD = 'USD'
}

export enum PaymentMethodType {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  reference: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: CurrencyType })
  currency: CurrencyType;

  @Column({ type: 'enum', enum: PaymentMethodType })
  payment_method: PaymentMethodType;

  @Column()
  @Index()
  customer_phone: string;

  @Column()
  customer_email: string;

  @Column({ 
    type: 'enum', 
    enum: PaymentStatus, 
    default: PaymentStatus.INITIATED 
  })
  @Index()
  status: PaymentStatus;

  @Column({ nullable: true })
  provider_transaction_id: string;

  @Column({ default: 'simulated' })
  provider_name: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  @Index()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}