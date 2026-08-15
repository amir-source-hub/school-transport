import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClientError,
  apiRequest,
  downloadApiFile,
  resetApiClientTransitionStateForTests,
} from '@/lib/api-client';
import { clearAuthSession, setAuthSession } from '@/features/auth/auth-session';

afterEach(() => {
  vi.restoreAllMocks();
  clearAuthSession();
  resetApiClientTransitionStateForTests();
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
    expect(url).toBe(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1'}/example`,
    );
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

  it('retries read-only requests when the API is still starting', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ready: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await expect(apiRequest<{ ready: boolean }>('/health')).resolves.toMatchObject({
      data: { ready: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry state-changing requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(apiRequest('/enrollments', { method: 'POST', body: {} })).rejects.toThrow(
      'fetch failed',
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('coalesces concurrent 401 refreshes and retries every request once', async () => {
    setAuthSession('expired-access', 'PARENT');
    let protectedCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({ success: true, data: { accessToken: 'fresh-access' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      protectedCalls += 1;
      if (protectedCalls <= 2) {
        return new Response(
          JSON.stringify({ success: false, error: { code: 'SESSION_EXPIRED' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(Promise.all([apiRequest('/one'), apiRequest('/two')])).resolves.toHaveLength(2);

    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh')),
    ).toHaveLength(1);
  });

  it('refreshes an expired session before retrying a file download', async () => {
    setAuthSession('expired-access', 'ADMIN');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { accessToken: 'fresh-access' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([80, 75, 3, 4]), {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="report.xlsx"' },
        }),
      );

    await expect(downloadApiFile('/admin/reports/comprehensive.xlsx')).resolves.toMatchObject({
      filename: 'report.xlsx',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves the backend error for a failed file download', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'REPORT_TOO_LARGE', message: 'بازه گزارش را کوچک‌تر کنید.' },
          meta: { requestId: 'report-request' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(downloadApiFile('/admin/reports/comprehensive.xlsx')).rejects.toMatchObject({
      status: 400,
      code: 'REPORT_TOO_LARGE',
      message: 'بازه گزارش را کوچک‌تر کنید.',
      requestId: 'report-request',
    } satisfies Partial<ApiClientError>);
  });
});
