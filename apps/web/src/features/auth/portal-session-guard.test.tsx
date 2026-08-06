import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/api-client';
import { PortalSessionGuard } from './portal-session-guard';

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams('tab=active'),
  router: undefined as unknown as { replace: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> },
}));
navigation.router = { replace: navigation.replace, refresh: navigation.refresh };
const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => '/parent/contracts',
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
}));
vi.mock('@/lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...original, apiRequest };
});

describe('PortalSessionGuard', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    navigation.replace.mockReset();
    navigation.refresh.mockReset();
  });

  it('does not render protected content before role verification resolves', async () => {
    let resolveSession!: (value: unknown) => void;
    apiRequest.mockReturnValue(new Promise((resolve) => (resolveSession = resolve)));
    render(
      <PortalSessionGuard role="PARENT">
        <p>private family data</p>
      </PortalSessionGuard>,
    );

    expect(screen.queryByText('private family data')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();

    resolveSession({ success: true, data: { user: { role: 'PARENT' } } });
    expect(await screen.findByText('private family data')).toBeInTheDocument();
  });

  it('routes a valid wrong-role session to its own portal without exposing children', async () => {
    apiRequest.mockResolvedValue({ success: true, data: { user: { role: 'ADMIN' } } });
    render(
      <PortalSessionGuard role="PARENT">
        <p>private family data</p>
      </PortalSessionGuard>,
    );

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/admin/dashboard'));
    expect(screen.queryByText('private family data')).not.toBeInTheDocument();
  });

  it('redirects an expired session once with a safe same-origin return path', async () => {
    apiRequest.mockRejectedValue(new ApiClientError(401, 'SESSION_EXPIRED', 'expired'));
    render(
      <PortalSessionGuard role="PARENT">
        <p>private family data</p>
      </PortalSessionGuard>,
    );

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        '/login?next=%2Fparent%2Fcontracts%3Ftab%3Dactive',
      ),
    );
    expect(navigation.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText('private family data')).not.toBeInTheDocument();
  });

  it('keeps dependency outages distinct from invalid credentials and allows retry', async () => {
    apiRequest
      .mockRejectedValueOnce(new ApiClientError(503, 'SERVICE_UNAVAILABLE', 'offline'))
      .mockResolvedValueOnce({ success: true, data: { user: { role: 'PARENT' } } });
    const user = userEvent.setup();
    render(
      <PortalSessionGuard role="PARENT">
        <p>private family data</p>
      </PortalSessionGuard>,
    );

    expect(
      await screen.findByText('بررسی نشست حساب ممکن نیست. اتصال خود را بررسی کنید.'),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    expect(await screen.findByText('private family data')).toBeInTheDocument();
  });

  it('ignores a retry verification that resolves after the guard unmounts', async () => {
    apiRequest.mockRejectedValueOnce(new ApiClientError(503, 'SERVICE_UNAVAILABLE', 'offline'));
    let resolveRetry!: (value: unknown) => void;
    apiRequest.mockReturnValueOnce(new Promise((resolve) => (resolveRetry = resolve)));
    const user = userEvent.setup();
    const view = render(
      <PortalSessionGuard role="PARENT">
        <p>private family data</p>
      </PortalSessionGuard>,
    );

    await screen.findByRole('button', { name: 'تلاش دوباره' });
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    view.unmount();
    resolveRetry({ success: true, data: { user: { role: 'ADMIN' } } });
    await Promise.resolve();

    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
