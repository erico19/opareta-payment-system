import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { PaymentStatus } from './payment.entity';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  payment_reference: string;

  @Column()
  provider_id: string;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column()
  @Index()
  event_timestamp: Date;

  @Column({ unique: true })
  @Index()
  idempotency_key: string;

  @CreateDateColumn()
  processed_at: Date;

  @Column('jsonb', { nullable: true })
  payload: any;
}