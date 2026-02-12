import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { PaymentStatus } from './payment.entity';

@Entity('payment_audit_log')
export class PaymentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  payment_reference: string;

  @Column({ type: 'enum', enum: PaymentStatus, nullable: true })
  from_status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentStatus })
  to_status: PaymentStatus;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}