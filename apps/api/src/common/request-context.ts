import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextState {
  requestId: string;
  traceId: string;
}

@Injectable()
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(
    requestId: string,
    callback: () => T,
    traceId = requestId.replaceAll('-', '').slice(0, 32),
  ): T {
    return this.storage.run({ requestId, traceId }, callback);
  }

  get requestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  get traceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }
}
