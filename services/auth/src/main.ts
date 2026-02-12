import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Counter, Histogram } from 'prom-client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Count of HTTP requests',
    labelNames: ['method', 'path', 'status'],
  });
  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  });

  app.use((req, res, next) => {
    const path = req.route?.path || req.path;
    const method = req.method;
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      const status = String(res.statusCode);
      httpRequestsTotal.labels(method, path, status).inc();
      end({ method, path, status });
    });
    next();
  });
  
  // Global prefix FIRST
  app.setGlobalPrefix('auth');

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger documentation LAST (after global prefix)
  const config = new DocumentBuilder()
    .setTitle('Opareta Auth Service')
    .setDescription('Authentication service for Opareta Payment System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log(`Auth service running on port ${process.env.PORT || 3001}`);
}
bootstrap();