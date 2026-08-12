import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isStudentRouteActive, StudentShell } from './student-shell';

const navigation = vi.hoisted(() => ({ pathname: '/student/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe('student mobile shell', () => {
  afterEach(() => {
    navigation.pathname = '/student/dashboard';
  });

  it.each([320, 360, 390, 768])('reserves dock and safe-area space at a %ipx viewport', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    render(
      <StudentShell>
        <button type="button">آخرین اقدام</button>
      </StudentShell>,
    );

    const main = screen.getByRole('main');
    const dock = screen.getByRole('navigation', { name: 'ناوبری سریع موبایل' });
    expect(main.className).toContain(
      'pb-[calc(var(--parent-mobile-dock-height)+env(safe-area-inset-bottom)+1rem)]',
    );
    expect(main.className).toContain('[&_:focus]:scroll-mb-');
    expect(dock.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(dock.className).toContain('min-h-[calc(var(--parent-mobile-dock-height)');
    expect(within(dock).getAllByRole('link')).toHaveLength(4);
  });

  it('matches only the selected route segment and marks nested dock routes active', () => {
    expect(isStudentRouteActive('/student/students/42', '/student/students')).toBe(true);
    expect(isStudentRouteActive('/student/studentship', '/student/students')).toBe(false);
    expect(isStudentRouteActive('/student/payments/', '/student/payments')).toBe(true);

    navigation.pathname = '/student/students/42';
    render(<StudentShell>content</StudentShell>);

    const dock = screen.getByRole('navigation', { name: 'ناوبری سریع موبایل' });
    expect(screen.getAllByRole('link', { name: 'دانش‌آموزان' })).toHaveLength(2);
    expect(dock.querySelector('a[href="/student/students"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(dock.querySelector('a[href="/student/dashboard"]')).not.toHaveAttribute('aria-current');
  });

  it('keeps the desktop sidebar fixed to the viewport and places the homepage action in the header', () => {
    const { container } = render(<StudentShell>content</StudentShell>);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('sticky', 'top-16', 'h-[calc(100vh-4rem)]');
    expect(within(aside as HTMLElement).queryByRole('link', { name: /صفحه اصلی/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'صفحه اصلی' })).toHaveAttribute('href', '/');
    expect(within(aside as HTMLElement).getAllByRole('link', { name: 'ثبت‌نام' })).toHaveLength(1);
  });

  it('removes the fixed dock while an editing control opens a virtual keyboard', async () => {
    const listeners = new Set<EventListener>();
    const viewport = {
      height: 800,
      addEventListener: vi.fn((_event: string, listener: EventListener) => listeners.add(listener)),
      removeEventListener: vi.fn((_event: string, listener: EventListener) =>
        listeners.delete(listener),
      ),
    };
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });

    render(
      <StudentShell>
        <label>
          شماره تماس
          <input />
        </label>
      </StudentShell>,
    );
    const dock = screen.getByRole('navigation', { name: 'ناوبری سریع موبایل' });
    viewport.height = 400;
    const input = screen.getByRole('textbox', { name: 'شماره تماس' });
    act(() => {
      input.focus();
      fireEvent.focusIn(input);
    });

    await waitFor(() => expect(dock).toHaveAttribute('data-keyboard-open', 'true'));
    expect(dock).toHaveClass('hidden');
  });
});
