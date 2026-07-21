import { describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { ResponseMetadataInterceptor } from './response-metadata.interceptor';
import { RequestContext } from './request-context';

describe('ResponseMetadataInterceptor', () => {
  it('adds the active request ID to API response metadata', async () => {
    const requestContext = new RequestContext();
    const interceptor = new ResponseMetadataInterceptor(requestContext);

    const result = await requestContext.run('request-123', () =>
      firstValueFrom(
        interceptor.intercept({} as never, {
          handle: () => of({ success: true, data: { ok: true } }),
        }),
      ),
    );

    expect(result).toEqual({
      success: true,
      data: { ok: true },
      meta: { requestId: 'request-123' },
    });
  });

  it('does not reshape non-API responses', async () => {
    const interceptor = new ResponseMetadataInterceptor(new RequestContext());
    const result = await firstValueFrom(
      interceptor.intercept({} as never, { handle: () => of('plain response') }),
    );

    expect(result).toBe('plain response');
  });
});
