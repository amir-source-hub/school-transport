import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { GlobalExceptionFilter } from './common/filters';
import { registerSecurityHeaders } from './common/security-headers';
import { AppLogger } from './common/logger';
import fastifyCookie = require('@fastify/cookie');
import { RequestContext } from './common/request-context';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  registerSecurityHeaders(
    app.getHttpAdapter().getInstance(),
    configService.nodeEnv === 'production',
  );

  app.setGlobalPrefix('api/v1');

  const openApiConfig = new DocumentBuilder()
    .setTitle('School Transport API')
    .setDescription('Canonical REST contract for the school transport MVP.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, openApiDocument, {
    jsonDocumentUrl: 'api/v1/openapi.json',
  });

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
