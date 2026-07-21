import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from './response';
import { RequestContext } from './request-context';

@Injectable()
export class ResponseMetadataInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContext) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (!isApiResponse(body)) return body;
        return {
          ...body,
          meta: {
            ...body.meta,
            requestId: this.requestContext.requestId,
          },
        };
      }),
    );
  }
}

function isApiResponse(body: unknown): body is ApiResponse {
  return typeof body === 'object' && body !== null && 'success' in body;
}
