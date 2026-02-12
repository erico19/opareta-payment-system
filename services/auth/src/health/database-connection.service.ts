import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class DatabaseConnectionService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async check(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.usersRepository.query('SELECT 1');
      const responseTime = Date.now() - start;
      return { status: 'connected', responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;
      return { status: 'disconnected', responseTime };
    }
  }
}