import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'debug',
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      redact: {
        paths: [
          'password', 'passwordHash', 'password_hash',
          'codeHash', 'code_hash',
          'token', 'accessToken', 'refreshToken',
          'authorization',
          'secret', 'secretKey',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  getPino() {
    return this.logger;
  }
}
