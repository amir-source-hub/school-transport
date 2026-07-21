import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _reply: FastifyReply, next: () => void) {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuid();
    req.headers['x-correlation-id'] = correlationId;
    (req as any).correlationId = correlationId;
    next();
  }
}
