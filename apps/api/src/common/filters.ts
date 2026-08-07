import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AppError } from './errors';
import { AppLogger } from './logger';
import { RequestContext } from './request-context';
import { translateDatabaseError } from './database-errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContext,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    if (exception instanceof AppError) {
      this.logger.warn(exception.message, exception.code);
      return reply.status(exception.status).send({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          field: exception.field || undefined,
          details: exception.details || undefined,
        },
        meta: { requestId: this.requestContext.requestId },
      });
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();
      let message = exception.message;
      let details: Record<string, string[]> | undefined;

      if (typeof response === 'object' && response !== null) {
        const resp = response as Record<string, unknown>;
        if (Array.isArray(resp.message)) {
          details = { validation: resp.message as string[] };
          message = 'Validation failed.';
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        }
        if (resp.fieldErrors && typeof resp.fieldErrors === 'object') {
          details = resp.fieldErrors as Record<string, string[]>;
        }
      }

      this.logger.warn(message, 'HttpException');
      return reply.status(status).send({
        success: false,
        error: {
          code: status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_ERROR',
          message,
          details,
        },
        meta: { requestId: this.requestContext.requestId },
      });
    }

    const databaseError = translateDatabaseError(exception);
    if (databaseError) {
      const { error, diagnostics } = databaseError;
      this.logger.warn(
        {
          event: 'database_error',
          requestId: this.requestContext.requestId,
          ...diagnostics,
        },
        'GlobalExceptionFilter',
      );
      return reply.status(error.status).send({
        success: false,
        error: { code: error.code, message: error.message },
        meta: { requestId: this.requestContext.requestId },
      });
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : undefined,
      'GlobalExceptionFilter',
    );
    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
      },
      meta: { requestId: this.requestContext.requestId },
    });
  }
}
