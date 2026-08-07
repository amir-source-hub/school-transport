import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminShell } from '@/features/admin-shell/admin-shell';
import { StudentShell } from '@/features/student-shell/student-shell';
import { getAuthSession, setAuthSession } from './auth-session';

const navigation = vi.hoisted(() => ({
  pathname: '/student/dashboard',
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const logout = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, refresh: navigation.refresh }),
}));

vi.mock('./auth-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./auth-api')>();
  return { ...original, logout };
});

afterEach(() => {
  navigation.replace.mockReset();
  navigation.refresh.mockReset();
  logout.mockReset();
});

describe.each([
  ['student', StudentShell, 'PARENT', '/student/dashboard'],
  ['administrator', AdminShell, 'ADMIN', '/admin/dashboard'],
] as const)('%s navigation logout', (_label, Shell, role, pathname) => {
  it('keeps the action in the side navigation and securely clears the session', async () => {
    navigation.pathname = pathname;
    logout.mockResolvedValue({ loggedOut: true });
    setAuthSession('access-token', role);
    const user = userEvent.setup();

    render(
      <Shell>
        <p>protected content</p>
      </Shell>,
    );

    const logoutButton = screen.getByRole('button', { name: 'خروج از حساب' });
    expect(logoutButton).toHaveClass('min-h-11');
    await user.click(logoutButton);

    expect(logout).toHaveBeenCalledOnce();
    expect(getAuthSession()).toEqual({ accessToken: null, role: null });
    expect(navigation.replace).toHaveBeenCalledWith('/login');
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});
