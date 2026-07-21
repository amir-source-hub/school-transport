import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { RequestContext } from './request-context';

const REDACTED_PATHS = [
  'password',
  '*.password',
  'passwordHash',
  '*.passwordHash',
  'password_hash',
  '*.password_hash',
  'otp',
  '*.otp',
  'otpCode',
  '*.otpCode',
  'codeHash',
  '*.codeHash',
  'code_hash',
  '*.code_hash',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'set-cookie',
  '*.set-cookie',
  'secret',
  '*.secret',
  'secretKey',
  '*.secretKey',
  'paymentCredentials',
  '*.paymentCredentials',
];

@Injectable()
export class AppLogger implements LoggerService {
  private logger: pino.Logger;

  constructor(private readonly requestContext: RequestContext) {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'debug',
      redact: {
        paths: REDACTED_PATHS,
        censor: '[REDACTED]',
      },
    });
  }

  private bindings(context?: string) {
    return {
      ...(this.requestContext.requestId ? { requestId: this.requestContext.requestId } : {}),
      ...(context ? { context } : {}),
    };
  }

  log(message: any, context?: string) {
    this.logger.info(this.bindings(context), message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ ...this.bindings(context), ...(trace ? { trace } : {}) }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn(this.bindings(context), message);
  }

  debug(message: any, context?: string) {
    this.logger.debug(this.bindings(context), message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace(this.bindings(context), message);
  }

  getPino() {
    return this.logger;
  }
}
