import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthSession, clearAuthSession } from './auth-session';
import { PortalSessionGuard } from './portal-session-guard';
import { resetApiClientTransitionStateForTests } from '@/lib/api-client';

const navigation = vi.hoisted(() => {
  const router = { replace: vi.fn(), refresh: vi.fn() };
  return { router, searchParams: new URLSearchParams() };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/parent/dashboard',
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
}));

afterEach(() => {
  vi.restoreAllMocks();
  clearAuthSession();
  resetApiClientTransitionStateForTests();
});

describe('portal session hard-reload bootstrap', () => {
  it('stores a refreshed token with empty memory, then trusts the retried /auth/me role', async () => {
    clearAuthSession();
    let meCalls = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(
          JSON.stringify({ success: true, data: { accessToken: 'reload-access' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/auth/me')) {
        meCalls += 1;
        if (meCalls === 1) {
          return new Response(
            JSON.stringify({ success: false, error: { code: 'SESSION_EXPIRED' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer reload-access');
        return new Response(
          JSON.stringify({ success: true, data: { user: { role: 'PARENT' } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <PortalSessionGuard role="PARENT">
        <p>restored protected content</p>
      </PortalSessionGuard>,
    );

    expect(await screen.findByText('restored protected content')).toBeInTheDocument();
    expect(getAuthSession()).toEqual({ accessToken: 'reload-access', role: 'PARENT' });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(
      1,
    );
    expect(meCalls).toBe(2);
  });
});

