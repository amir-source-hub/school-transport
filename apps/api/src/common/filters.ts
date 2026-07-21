import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AppError } from './errors';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    if (exception instanceof AppError) {
      return reply.status(exception.status).send({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          field: exception.field || undefined,
          details: exception.details || undefined,
        },
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
      }

      return reply.status(status).send({
        success: false,
        error: {
          code: status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_ERROR',
          message,
          details,
        },
      });
    }

    console.error('Unhandled exception:', exception);
    return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    });
  }
}
