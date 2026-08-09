import { Injectable, NestMiddleware } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'node:http';
import { v4 as uuid } from 'uuid';
import { RequestContext } from './request-context';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TRACEPARENT = /^00-([a-f0-9]{32})-[a-f0-9]{16}-[0-9a-f]{2}$/i;

export function resolveRequestId(header: string | string[] | undefined): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : uuid();
}

export function resolveTraceId(header: string | string[] | undefined, requestId: string): string {
  const candidate = Array.isArray(header) ? header[0] : header;
  return (
    TRACEPARENT.exec(candidate ?? '')?.[1].toLowerCase() ??
    requestId
      .replace(/[^a-f0-9]/gi, '')
      .padEnd(32, '0')
      .slice(0, 32)
      .toLowerCase()
  );
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContext) {}

  use(req: IncomingMessage, reply: ServerResponse, next: () => void) {
    const requestId = resolveRequestId(req.headers['x-correlation-id']);
    const traceId = resolveTraceId(req.headers.traceparent, requestId);
    req.headers['x-correlation-id'] = requestId;
    reply.setHeader('X-Request-ID', requestId);
    reply.setHeader('X-Trace-ID', traceId);
    this.requestContext.run(requestId, next, traceId);
  }
}
