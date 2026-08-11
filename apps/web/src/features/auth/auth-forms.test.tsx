import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './auth-forms';
import { ApiClientError } from '@/lib/api-client';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

const authApi = vi.hoisted(() => ({
  requestParentOtp: vi.fn(),
  verifyParentOtp: vi.fn(),
  requestAdminPasswordChallenge: vi.fn(),
  verifyAdminOtp: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, refresh: navigation.refresh }),
}));

vi.mock('./auth-api', () => authApi);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-08-06T10:00:00Z'));
  authApi.requestParentOtp.mockReset().mockResolvedValue({
    data: {
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
      cooldownSeconds: 60,
      developmentCode: '123456',
    },
  });
  authApi.verifyParentOtp.mockReset().mockResolvedValue({
    data: {
      user: { id: 'u1', username: 'u1', phoneNumber: '09123456789', role: 'PARENT' },
      accessToken: 'access-token',
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  navigation.replace.mockReset();
  navigation.refresh.mockReset();
});

const setup = () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
  render(<LoginForm />);
  return user;
};

const sendCode = async (user: ReturnType<typeof setup>) => {
  await user.type(screen.getByLabelText(/شماره همراه/), '09123456789');
  await user.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));
  await screen.findByText('کد تأیید ارسال شد');
};

describe('OTP code entry', () => {
  it('counts down from the server expiry and shows the resend cooldown', async () => {
    const user = setup();
    await sendCode(user);

    expect(screen.getByText(/کد تا \d+ ثانیه دیگر معتبر است/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ارسال مجدد کد تا \d+ ثانیه دیگر/ })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'در این دستگاه به خاطر بسپار (۷ روز)' }),
    ).not.toBeChecked();
  });

  it('shows the expired state and re-requests a fresh code after the window closes', async () => {
    const user = setup();
    await sendCode(user);

    await act(async () => {
      vi.advanceTimersByTime(121_000);
    });

    expect(screen.getByText(/زمان اعتبار کد به پایان رسیده است/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تأیید و ادامه' })).toBeDisabled();
    expect(screen.getByLabelText(/کد تأیید/)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'دریافت کد جدید' }));

    expect(authApi.requestParentOtp).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(/کد تأیید/)).toHaveValue('');
    expect(authApi.verifyParentOtp).not.toHaveBeenCalled();
  });

  it('sends rememberMe when the checkbox is selected', async () => {
    const user = setup();
    await sendCode(user);

    await user.click(screen.getByRole('checkbox', { name: 'در این دستگاه به خاطر بسپار (۷ روز)' }));
    await user.type(screen.getByLabelText(/کد تأیید/), '123456');
    await user.click(screen.getByRole('button', { name: 'تأیید و ادامه' }));

    expect(authApi.verifyParentOtp).toHaveBeenCalledWith('09123456789', '123456', true);
    expect(navigation.replace).toHaveBeenCalledWith('/student/dashboard');
  });

  it('stays on the phone step and clears the pending OTP when the phone changes', async () => {
    const user = setup();
    await sendCode(user);

    await user.click(screen.getByRole('button', { name: 'تغییر شماره همراه' }));

    expect(screen.getByRole('button', { name: 'دریافت کد تأیید' })).toBeInTheDocument();
    expect(authApi.verifyParentOtp).not.toHaveBeenCalled();
  });
});

describe('role selector and first-time onboarding', () => {
  it('defaults to the student role and shows the guardian phone label', () => {
    render(<LoginForm />);

    expect(screen.getByRole('option', { name: /دانش.*آموز/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText(/شماره همراه سرپرست دانش‌آموز/)).toBeInTheDocument();
  });

  it('shows the coming-soon notice and does not submit for a non-student role', async () => {
    const user = setup();

    await user.click(screen.getByRole('option', { name: /مدیر مدارس/ }));

    expect(screen.getByText('این بخش به‌زودی فعال می‌شود')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'دریافت کد تأیید' })).toBeDisabled();

    await user.type(screen.getByLabelText(/شماره همراه/), '09123456789');
    await user.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));

    expect(authApi.requestParentOtp).not.toHaveBeenCalled();
  });

  it('redirects a new phone into enrollment instead of opening the panel', async () => {
    authApi.verifyParentOtp.mockReset().mockResolvedValue({
      data: {
        user: null,
        onboarding: {
          sessionId: 'ob-1',
          expiresAt: new Date(Date.now() + 100_000).toISOString(),
          currentStep: null,
        },
      },
    });
    const user = setup();
    await sendCode(user);
    await user.type(screen.getByLabelText(/کد تأیید/), '123456');
    await user.click(screen.getByRole('button', { name: 'تأیید و ادامه' }));

    expect(authApi.verifyParentOtp).toHaveBeenCalledWith('09123456789', '123456', false);
    expect(navigation.replace).toHaveBeenCalledWith('/onboarding/enrollments');
    expect(navigation.replace).not.toHaveBeenCalledWith('/student/dashboard');
  });

  it.each([
    ['OTP_INVALID', 'کد واردشده درست نیست', 'کد تأیید نادرست است'],
    ['OTP_EXPIRED', 'کد جدیدی درخواست کنید', 'کد تأیید منقضی شده است'],
    ['OTP_NOT_FOUND', 'کد جدیدی درخواست کنید', 'کد تأیید قابل بررسی نیست'],
    ['OTP_TOO_MANY_ATTEMPTS', 'کد جدیدی درخواست کنید', 'تلاش بیش از حد مجاز'],
  ])('surfaces %s as a Persian form error with its tracking ID', async (code, message, title) => {
    authApi.verifyParentOtp.mockReset().mockRejectedValue(
      new ApiClientError(400, code, 'raw message', 'tracking-123'),
    );
    const user = setup();
    await sendCode(user);
    await user.type(screen.getByLabelText(/کد تأیید/), '123456');
    await user.click(screen.getByRole('button', { name: 'تأیید و ادامه' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(title);
    expect(alert).toHaveTextContent(message);
    expect(alert).toHaveTextContent('شناسه پیگیری: tracking-123');
    expect(alert).not.toHaveTextContent('raw message');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('surfaces the resend cooldown error as Persian feedback with its tracking ID', async () => {
    authApi.requestParentOtp.mockReset().mockRejectedValue(
      new ApiClientError(400, 'OTP_COOLDOWN', 'raw message', 'tracking-456'),
    );
    const user = setup();
    await user.type(screen.getByLabelText(/شماره همراه/), '09123456789');
    await user.click(screen.getByRole('button', { name: 'دریافت کد تأیید' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('کد جدید خیلی زود است');
    expect(alert).toHaveTextContent(/چند ثانیه صبر کنید/);
    expect(alert).toHaveTextContent('شناسه پیگیری: tracking-456');
    expect(alert).not.toHaveTextContent('raw message');
  });
});
