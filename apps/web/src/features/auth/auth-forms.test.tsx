import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminLoginForm, LoginForm } from './auth-forms';

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
const authApi = vi.hoisted(() => ({ loginOrRegisterParent: vi.fn(), loginAdmin: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
vi.mock('./auth-api', () => authApi);

function usernameField() {
  return screen.getByLabelText((label, element) => {
    const el = element as HTMLElement;
    return el.tagName === 'INPUT' && label.trim().startsWith('نام کاربری');
  });
}

function passwordField() {
  return screen.getByLabelText((label, element) => {
    const el = element as HTMLElement;
    return el.tagName === 'INPUT' && el.getAttribute('type') === 'password';
  });
}

beforeEach(() => {
  navigation.replace.mockReset();
  authApi.loginOrRegisterParent.mockReset();
  authApi.loginAdmin.mockReset();
});

describe('family fixed-credential authentication', () => {
  it('starts enrollment with the submitted guardian phone and national ID', async () => {
    authApi.loginOrRegisterParent.mockResolvedValue({
      data: {
        user: null,
        onboarding: {
          sessionId: 'onboarding-1',
          expiresAt: '2026-08-20T00:00:00.000Z',
          currentStep: null,
          nationalId: '0084575948',
        },
      },
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.clear(screen.getByLabelText(/شماره همراه سرپرست/));
    await user.type(screen.getByLabelText(/شماره همراه سرپرست/), '09123456789');
    await user.type(screen.getByLabelText(/کد ملی سرپرست/), '0084575948');
    await user.click(screen.getByRole('button', { name: 'ورود یا ثبت‌نام و ادامه' }));

    expect(authApi.loginOrRegisterParent).toHaveBeenCalledWith('09123456789', '0084575948', false);
    expect(navigation.replace).toHaveBeenCalledWith('/onboarding/enrollments');
    expect(screen.queryByLabelText(/کد تأیید/)).not.toBeInTheDocument();
  });

  it('opens the panel for an existing family without an OTP step', async () => {
    authApi.loginOrRegisterParent.mockResolvedValue({
      data: {
        user: { id: 'family-1', username: 'family', phoneNumber: '09123456789', role: 'PARENT' },
        accessToken: 'access-token',
      },
    });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.clear(screen.getByLabelText(/شماره همراه سرپرست/));
    await user.type(screen.getByLabelText(/شماره همراه سرپرست/), '09123456789');
    await user.type(screen.getByLabelText(/کد ملی سرپرست/), '0084575948');
    await user.click(screen.getByRole('button', { name: 'ورود یا ثبت‌نام و ادامه' }));
    expect(navigation.replace).toHaveBeenCalledWith('/student/dashboard');
  });
});

describe('admin credential authentication', () => {
  it('logs in with username and password without requesting an OTP', async () => {
    authApi.loginAdmin.mockResolvedValue({
      data: {
        user: { id: 'admin-1', username: 'admin', phoneNumber: '09120000000', role: 'ADMIN' },
        accessToken: 'admin-token',
      },
    });
    const user = userEvent.setup();
    render(<AdminLoginForm />);
    await user.type(usernameField(), 'admin');
    await user.type(passwordField(), 'secret');
    await user.click(screen.getByRole('button', { name: 'ورود به پنل مدیریت' }));
    expect(authApi.loginAdmin).toHaveBeenCalledWith('admin', 'secret', false);
    expect(navigation.replace).toHaveBeenCalledWith('/admin/dashboard');
  });
});
