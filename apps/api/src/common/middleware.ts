import { Injectable, NestMiddleware } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'node:http';
import { v4 as uuid } from 'uuid';
import { RequestContext } from './request-context';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function resolveRequestId(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : uuid();
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContext) {}

  use(req: IncomingMessage, reply: ServerResponse, next: () => void) {
    const requestId = resolveRequestId(req.headers['x-correlation-id']);
    req.headers['x-correlation-id'] = requestId;
    reply.setHeader('X-Request-ID', requestId);
    this.requestContext.run(requestId, next);
  }
}
