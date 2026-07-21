import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiRequest } from '@/lib/api-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API client', () => {
  it('sends credentialed JSON requests with a correlation ID', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { accepted: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiRequest<{ accepted: boolean }>('/example', {
      method: 'POST',
      body: { value: 'safe' },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    const headers = new Headers(request?.headers);
    expect(url).toBe('http://localhost:3001/api/v1/example');
    expect(request?.credentials).toBe('include');
    expect(request?.body).toBe(JSON.stringify({ value: 'safe' }));
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Correlation-Id')).toBeTruthy();
  });

  it('normalizes documented validation details and request IDs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed.',
            details: { username: 'Required' },
          },
          meta: { requestId: 'req-documented' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(apiRequest('/example')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      requestId: 'req-documented',
      fieldErrors: { username: ['Required'] },
    } satisfies Partial<ApiClientError>);
  });

  it('returns a safe typed error for non-JSON failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('gateway unavailable', { status: 503 }),
    );

    await expect(apiRequest('/example')).rejects.toMatchObject({
      status: 503,
      code: 'INVALID_API_RESPONSE',
      message: 'Request failed.',
    } satisfies Partial<ApiClientError>);
  });

  it('rejects paths outside the configured API base', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(apiRequest('https://untrusted.example')).rejects.toThrow(
      'API paths must start with a forward slash.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
