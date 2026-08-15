import {
  clearAuthSession,
  getAuthSession,
  getAuthSessionVersion,
  setAuthAccessToken,
} from '@/features/auth/auth-session';
import type { ApiEnvelope, ApiFailure, ApiSuccess } from '@/types/api';

type ApiRequestOptions = Omit<RequestInit, 'body' | 'credentials'> & {
  body?: unknown;
  timeoutMs?: number;
  redirectOnAuthFailure?: boolean;
};

let browserRefreshPromise: Promise<boolean> | null = null;
let loginRedirectStarted = false;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  get isSessionExpired() {
    return this.status === 401 || this.code === 'SESSION_EXPIRED';
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiSuccess<T>> {
  return performApiRequest<T>(path, options, true);
}

export async function downloadApiFile(path: string): Promise<{ blob: Blob; filename: string }> {
  return performFileDownload(path, true);
}

async function performFileDownload(
  path: string,
  allowRefresh: boolean,
): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers({
    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const { accessToken } = getAuthSession();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    headers,
  });
  if (response.status === 401 && allowRefresh) {
    const refreshed = await refreshBrowserSession();
    if (refreshed) return performFileDownload(path, false);
    redirectToLogin();
  }
  if (!response.ok) {
    if (response.status === 401) redirectToLogin();
    const requestId = response.headers.get('X-Request-Id') ?? undefined;
    try {
      const payload = (await response.json()) as ApiFailure;
      if (!payload.success) {
        throw new ApiClientError(
          response.status,
          payload.error.code || 'DOWNLOAD_FAILED',
          payload.error.message || 'Report download failed.',
          payload.meta?.requestId ?? requestId,
          payload.error.fieldErrors,
        );
      }
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
    }
    throw new ApiClientError(
      response.status,
      'DOWNLOAD_FAILED',
      'Report download failed.',
      requestId,
    );
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/i)?.[1] ?? `school-transport-report.xlsx`;
  return { blob: await response.blob(), filename };
}

async function performApiRequest<T>(
  path: string,
  options: ApiRequestOptions,
  allowRefresh: boolean,
): Promise<ApiSuccess<T>> {
  const {
    body,
    timeoutMs,
    redirectOnAuthFailure = true,
    signal: requestedSignal,
    ...requestInit
  } = options;
  const url = buildApiUrl(path);
  const headers = new Headers(options.headers);
  const correlationId = crypto.randomUUID();
  headers.set('Accept', 'application/json');
  headers.set('X-Correlation-Id', correlationId);
  const { accessToken } = getAuthSession();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  await forwardServerCookies(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const signal = createRequestSignal(requestedSignal, timeoutMs);
  const response = await fetchWithStartupRetry(url, {
    cache: 'no-store',
    ...requestInit,
    body: serializeBody(body),
    credentials: 'include',
    headers,
    signal,
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    typeof window !== 'undefined' &&
    (path === '/auth/me' || !path.startsWith('/auth/'))
  ) {
    const refreshed = await refreshBrowserSession();
    if (refreshed) return performApiRequest<T>(path, options, false);
    if (redirectOnAuthFailure) redirectToLogin();
  }

  if (response.status === 204) {
    return { success: true, data: undefined as T, meta: { requestId: correlationId } };
  }

  const payload = await parseEnvelope<T>(response, correlationId);
  if (!response.ok || !payload.success) {
    throw toApiClientError(response.status, payload, correlationId);
  }

  return payload as ApiSuccess<T>;
}

async function fetchWithStartupRetry(url: string, init: RequestInit) {
  const method = (init.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  const delays = canRetry ? [0, 200, 500] : [0];

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
    try {
      return await fetch(url, init);
    } catch (error) {
      const isLastAttempt = attempt === delays.length - 1;
      if (!canRetry || isLastAttempt || !(error instanceof TypeError) || init.signal?.aborted) {
        throw error;
      }
    }
  }

  throw new TypeError('API request failed.');
}

async function forwardServerCookies(headers: Headers) {
  if (typeof window !== 'undefined' || headers.has('Cookie')) return;
  try {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    const value = store
      .getAll()
      .map(({ name, value: cookieValue }) => `${name}=${encodeURIComponent(cookieValue)}`)
      .join('; ');
    if (value) headers.set('Cookie', value);
  } catch {
    // Unit tests and static rendering do not always have a Next request scope.
  }
}

async function refreshBrowserSession() {
  if (!browserRefreshPromise) {
    const version = getAuthSessionVersion();
    browserRefreshPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json', 'X-Correlation-Id': crypto.randomUUID() },
        });
        if (!response.ok) return false;
        const payload = (await response.json()) as ApiSuccess<{ accessToken: string }>;
        if (payload.success && payload.data.accessToken && version === getAuthSessionVersion()) {
          setAuthAccessToken(payload.data.accessToken);
        }
        return payload.success && version === getAuthSessionVersion();
      } catch {
        return false;
      }
    })().finally(() => {
      browserRefreshPromise = null;
    });
  }
  return browserRefreshPromise;
}

function redirectToLogin() {
  clearAuthSession();
  if (loginRedirectStarted || typeof window === 'undefined') return;
  loginRedirectStarted = true;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export function resetApiClientTransitionStateForTests() {
  browserRefreshPromise = null;
  loginRedirectStarted = false;
}

async function parseEnvelope<T>(response: Response, requestId: string): Promise<ApiEnvelope<T>> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(response.status, 'INVALID_API_RESPONSE', 'Request failed.', requestId);
  }
}

function buildApiUrl(path: string) {
  if (!path.startsWith('/')) {
    throw new Error('API paths must start with a forward slash.');
  }

  const baseUrl =
    (typeof window === 'undefined' ? process.env.API_INTERNAL_BASE_URL : undefined) ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:5000/api/v1';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

function createRequestSignal(signal: AbortSignal | null | undefined, timeoutMs?: number) {
  const signals: AbortSignal[] = [];
  if (signal) signals.push(signal);
  if (timeoutMs !== undefined) signals.push(AbortSignal.timeout(timeoutMs));
  if (signals.length === 0) return undefined;
  if (signals.length === 1) return signals[0];
  return AbortSignal.any(signals);
}

function toApiClientError(
  status: number,
  payload: ApiEnvelope<unknown>,
  fallbackRequestId: string,
) {
  const failure = payload as ApiFailure;
  const details = failure.error?.fieldErrors ?? normalizeDetails(failure.error?.details);
  const requestId = failure.meta?.requestId ?? failure.error?.requestId ?? fallbackRequestId;
  return new ApiClientError(
    status,
    failure.error?.code ?? 'HTTP_ERROR',
    failure.error?.message ?? 'Request failed.',
    requestId,
    details,
  );
}

function normalizeDetails(details?: Record<string, string | string[]>) {
  if (!details) return undefined;
  return Object.fromEntries(
    Object.entries(details).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages : [messages],
    ]),
  );
}
