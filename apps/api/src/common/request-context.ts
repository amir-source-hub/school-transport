import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextState {
  requestId: string;
}

@Injectable()
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(requestId: string, callback: () => T): T {
    return this.storage.run({ requestId }, callback);
  }

  get requestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}
