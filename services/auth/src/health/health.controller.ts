import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseConnectionService } from './database-connection.service';
import { collectDefaultMetrics, register } from 'prom-client';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private static metricsInitialized = false;

  constructor(private readonly databaseConnection: DatabaseConnectionService) {
    if (!HealthController.metricsInitialized) {
      collectDefaultMetrics();
      HealthController.metricsInitialized = true;
    }
  }

  @Get()
  async check() {
    const dbStatus = await this.databaseConnection.check();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain')
  async metrics(): Promise<string> {
    return register.metrics();
  }
}