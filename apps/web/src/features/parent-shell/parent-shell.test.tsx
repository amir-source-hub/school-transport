import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isParentRouteActive, ParentShell } from './parent-shell';

const navigation = vi.hoisted(() => ({ pathname: '/parent/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe('parent mobile shell', () => {
  afterEach(() => {
    navigation.pathname = '/parent/dashboard';
  });

  it.each([320, 360, 390, 768])(
    'reserves dock and safe-area space at a %ipx viewport',
    (width) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      render(
        <ParentShell>
          <button type="button">آخرین اقدام</button>
        </ParentShell>,
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
    },
  );

  it('matches only the selected route segment and marks nested dock routes active', () => {
    expect(isParentRouteActive('/parent/students/42', '/parent/students')).toBe(true);
    expect(isParentRouteActive('/parent/studentship', '/parent/students')).toBe(false);
    expect(isParentRouteActive('/parent/payments/', '/parent/payments')).toBe(true);

    navigation.pathname = '/parent/students/42';
    render(<ParentShell>content</ParentShell>);

    const dock = screen.getByRole('navigation', { name: 'ناوبری سریع موبایل' });
    expect(screen.getAllByRole('link', { name: 'دانش‌آموزان' })).toHaveLength(2);
    expect(dock.querySelector('a[href="/parent/students"]')).toHaveAttribute('aria-current', 'page');
    expect(dock.querySelector('a[href="/parent/dashboard"]')).not.toHaveAttribute('aria-current');
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
      <ParentShell>
        <label>
          شماره تماس
          <input />
        </label>
      </ParentShell>,
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
