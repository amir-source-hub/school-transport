import { getAuthSession } from '@/features/auth/auth-session';
import type { ApiEnvelope, ApiFailure, ApiSuccess } from '@/types/api';

type ApiRequestOptions = Omit<RequestInit, 'body' | 'credentials'> & {
  body?: unknown;
  timeoutMs?: number;
};

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
  const { body, timeoutMs, signal: requestedSignal, ...requestInit } = options;
  const url = buildApiUrl(path);
  const headers = new Headers(options.headers);
  const correlationId = crypto.randomUUID();
  headers.set('Accept', 'application/json');
  headers.set('X-Correlation-Id', correlationId);
  const { accessToken } = getAuthSession();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const signal = createRequestSignal(requestedSignal, timeoutMs);
  const response = await fetch(url, {
    ...requestInit,
    body: serializeBody(body),
    credentials: 'include',
    headers,
    signal,
  });

  if (response.status === 204) {
    return { success: true, data: undefined as T, meta: { requestId: correlationId } };
  }

  const payload = await parseEnvelope<T>(response, correlationId);
  if (!response.ok || !payload.success) {
    throw toApiClientError(response.status, payload, correlationId);
  }

  return payload as ApiSuccess<T>;
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

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';
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
