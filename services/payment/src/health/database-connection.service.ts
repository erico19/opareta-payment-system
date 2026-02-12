import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payment/entities/payment.entity';

@Injectable()
export class DatabaseConnectionService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async check(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.paymentsRepository.query('SELECT 1');
      const responseTime = Date.now() - start;
      return { status: 'connected', responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;
      return { status: 'disconnected', responseTime };
    }
  }
}