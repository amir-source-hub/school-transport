import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/api-client';
import { OnboardingSessionGuard } from './onboarding-session-guard';

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(''),
  router: undefined as unknown as {
    replace: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  },
}));
navigation.router = { replace: navigation.replace, refresh: navigation.refresh };
const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => '/onboarding/enrollments',
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
}));
vi.mock('@/lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...original, apiRequest };
});

describe('OnboardingSessionGuard', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    navigation.replace.mockReset();
    navigation.refresh.mockReset();
  });

  it('shows the restricted enrollment steps once the onboarding session is verified', async () => {
    apiRequest.mockResolvedValue({ success: true, data: { status: 'PENDING' } });
    render(
      <OnboardingSessionGuard>
        <p>guided enrollment steps</p>
      </OnboardingSessionGuard>,
    );

    expect(await screen.findByText('guided enrollment steps')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/auth/onboarding/me', {
      cache: 'no-store',
      redirectOnAuthFailure: false,
    });
  });

  it('redirects an invalid or expired onboarding token to login', async () => {
    apiRequest.mockRejectedValue(new ApiClientError(401, 'SESSION_EXPIRED', 'expired'));
    render(
      <OnboardingSessionGuard>
        <p>guided enrollment steps</p>
      </OnboardingSessionGuard>,
    );

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/login?next=%2Fonboarding%2Fenrollments'));
    expect(screen.queryByText('guided enrollment steps')).not.toBeInTheDocument();
  });

  it('keeps dependency outages distinct from invalid credentials and allows retry', async () => {
    apiRequest
      .mockRejectedValueOnce(new ApiClientError(503, 'SERVICE_UNAVAILABLE', 'offline'))
      .mockResolvedValueOnce({ success: true, data: { status: 'PENDING' } });
    const user = userEvent.setup();
    render(
      <OnboardingSessionGuard>
        <p>guided enrollment steps</p>
      </OnboardingSessionGuard>,
    );

    expect(
      await screen.findByText('بررسی نشست ثبت‌نام ممکن نیست. اتصال خود را بررسی کنید.'),
    ).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    expect(await screen.findByText('guided enrollment steps')).toBeInTheDocument();
  });
});
