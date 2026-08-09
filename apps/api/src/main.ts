import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  mapValidationErrors,
  validationErrorMessage,
} from './common/validation-errors';
import { ConfigService, parseTrustedProxyCidrs } from './config/config.service';
import { GlobalExceptionFilter } from './common/filters';
import { registerSecurityHeaders } from './common/security-headers';
import { AppLogger } from './common/logger';
import fastifyCookie = require('@fastify/cookie');
import { RequestContext } from './common/request-context';
import { SwaggerModule } from '@nestjs/swagger';
import { createOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1024 * 1024,
      connectionTimeout: 10_000,
      requestTimeout: 15_000,
      keepAliveTimeout: 5_000,
      maxRequestsPerSocket: 100,
      logger: false,
      trustProxy: parseTrustedProxyCidrs(process.env.TRUSTED_PROXY_CIDRS),
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

  if (configService.apiDocsEnabled) {
    const openApiDocument = createOpenApiDocument(app);
    SwaggerModule.setup('api/docs', app, openApiDocument, {
      jsonDocumentUrl: 'api/v1/openapi.json',
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (validationErrors) => {
        const fieldErrors = mapValidationErrors(validationErrors);
        return new BadRequestException({
          message: validationErrorMessage(fieldErrors),
          fieldErrors,
        });
      },
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
