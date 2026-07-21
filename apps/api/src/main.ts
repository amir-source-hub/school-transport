import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { GlobalExceptionFilter } from './common/filters';
import { registerSecurityHeaders } from './common/security-headers';
import { AppLogger } from './common/logger';
import fastifyCookie from '@fastify/cookie';
import { RequestContext } from './common/request-context';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 10 * 1024 * 1024,
      logger: false,
    }),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);
  const logger = app.get(AppLogger);

  app.useLogger(logger);

  await app.register(fastifyCookie, {
    secret: configService.jwtSecret,
  });

  registerSecurityHeaders(app.getHttpAdapter().getInstance());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger, app.get(RequestContext)));

  app.enableCors({
    origin: configService.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Correlation-Id'],
  });

  app.enableShutdownHooks();

  await app.listen(configService.port, configService.host);
  logger.log(`API running on ${configService.host}:${configService.port}`);
}

bootstrap();
