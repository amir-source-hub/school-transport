import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DriverComingSoonForm } from './driver-coming-soon-form';
import { ManagerPortalLoginForm } from './manager-portal-login-form';
import { PortalRoleSelector } from './portal-role-selector';
import { safePortalPath } from './safe-next';
import { ApiClientError } from '@/lib/api-client';

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
const authApi = vi.hoisted(() => ({ loginManager: vi.fn() }));

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
  authApi.loginManager.mockReset();
});

describe('manager portal login', () => {
  it('logs in with username and password and opens the manager dashboard', async () => {
    authApi.loginManager.mockResolvedValue({
      data: {
        user: {
          id: 'manager-1',
          username: '09120000000',
          phoneNumber: '09120000000',
          role: 'SCHOOL_MANAGER',
          mustChangeCredentials: true,
        },
        accessToken: 'manager-token',
      },
    });
    const user = userEvent.setup();
    render(<ManagerPortalLoginForm />);
    await user.type(usernameField(), '09120000000');
    await user.type(passwordField(), 'temporary');
    await user.click(screen.getByRole('button', { name: 'ورود به پنل مدرسه' }));

    expect(authApi.loginManager).toHaveBeenCalledWith('09120000000', 'temporary', false);
    expect(navigation.replace).toHaveBeenCalledWith('/manager/dashboard');
  });

  it('honors a validated next path after login', async () => {
    authApi.loginManager.mockResolvedValue({
      data: {
        user: { id: 'manager-1', username: 'm', phoneNumber: '09120000000', role: 'SCHOOL_MANAGER' },
        accessToken: 'token',
      },
    });
    const user = userEvent.setup();
    render(<ManagerPortalLoginForm nextPath="/manager/students" />);
    await user.type(usernameField(), '09120000000');
    await user.type(passwordField(), 'temporary');
    await user.click(screen.getByRole('button', { name: 'ورود به پنل مدرسه' }));
    expect(navigation.replace).toHaveBeenCalledWith('/manager/students');
  });

  it('shows a generic failure message via the shared error formatter', async () => {
    authApi.loginManager.mockRejectedValue(
      new ApiClientError(401, 'INVALID_CREDENTIALS', 'نام کاربری یا رمز عبور صحیح نیست.'),
    );
    const user = userEvent.setup();
    render(<ManagerPortalLoginForm />);
    await user.type(usernameField(), 'manager');
    await user.type(passwordField(), 'wrong');
    await user.click(screen.getByRole('button', { name: 'ورود به پنل مدرسه' }));
    expect(await screen.findByText(/نام کاربری یا رمز عبور درست نیست/)).toBeInTheDocument();
  });
});

describe('driver coming-soon form', () => {
  it('keeps fields disabled and never submits a request', async () => {
    const user = userEvent.setup();
    render(<DriverComingSoonForm />);
    const username = usernameField();
    const password = passwordField();
    const submit = screen.getByRole('button', { name: 'ورود به پنل راننده' });

    expect(username).toBeDisabled();
    expect(password).toBeDisabled();
    expect(submit).toBeDisabled();
    expect(screen.getByText(/در حال آماده‌سازی/)).toBeInTheDocument();

    await user.click(submit);
    expect(authApi.loginManager).not.toHaveBeenCalled();
  });
});

describe('portal role selector', () => {
  function StatefulSelector() {
    const [selected, setSelected] = useState<
      'STUDENT_PORTAL' | 'SCHOOL_MANAGER' | 'DRIVER_COMING_SOON'
    >('STUDENT_PORTAL');
    return <PortalRoleSelector selected={selected} onSelect={setSelected} />;
  }

  it('selects roles with keyboard and marks driver as coming soon', async () => {
    const user = userEvent.setup();
    render(<StatefulSelector />);

    const student = screen.getByRole('radio', { name: /پنل دانش‌آموز/ });
    const manager = screen.getByRole('radio', { name: /پنل مدیر مدرسه/ });
    const driver = screen.getByRole('radio', { name: /پنل راننده/ });

    expect(student).toHaveAttribute('aria-checked', 'true');
    expect(driver).toHaveAttribute('tabindex', '-1');

    await user.click(manager);
    expect(manager).toHaveAttribute('aria-checked', 'true');
    expect(manager).not.toHaveAttribute('tabindex', '-1');
    expect(student).toHaveAttribute('tabindex', '-1');
  });

  it('does not select the disabled driver role', async () => {
    const onSelect = vi.fn();
    render(<PortalRoleSelector selected="STUDENT_PORTAL" onSelect={onSelect} />);
    const driver = screen.getByRole('radio', { name: /پنل راننده/ });
    await userEvent.click(driver);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('moves selection with arrow keys', async () => {
    const user = userEvent.setup();
    render(<StatefulSelector />);
    const student = screen.getByRole('radio', { name: /پنل دانش‌آموز/ });
    student.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: /پنل مدیر مدرسه/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('safePortalPath', () => {
  it('rejects protocol-relative and absolute values', () => {
    expect(safePortalPath('//evil.example/path', '/fallback')).toBe('/fallback');
    expect(safePortalPath('https://evil.example/path', '/fallback')).toBe('/fallback');
    expect(safePortalPath('/manager/students', '/fallback')).toBe('/manager/students');
    expect(safePortalPath(null, '/fallback')).toBe('/fallback');
  });
});