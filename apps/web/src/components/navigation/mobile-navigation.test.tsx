import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { AdminShell, isAdminRouteActive } from '@/features/admin-shell/admin-shell';
import { isPublicRouteActive, PublicHeader } from './public-header';

const navigation = vi.hoisted(() => ({ pathname: '/services' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe('phone navigation and compact controls', () => {
  afterEach(() => {
    navigation.pathname = '/services';
  });

  it('opens a focus-managed, scrollable public drawer at 320px and closes with Escape', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    const user = userEvent.setup();
    render(<PublicHeader />);

    const trigger = screen.getByRole('button', { name: 'باز کردن منوی اصلی' });
    expect(trigger).toHaveClass('min-h-11', 'min-w-11');
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'منوی اصلی' });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    const mobileNav = within(dialog).getByRole('navigation', { name: 'ناوبری موبایل' });
    expect(dialog.querySelector('.overflow-y-auto')).toHaveClass('overscroll-contain');
    for (const link of within(mobileNav).getAllByRole('link')) {
      expect(link).toHaveClass('min-h-11', 'whitespace-normal', 'break-words');
    }
    expect(within(mobileNav).getByRole('link', { name: 'خدمات' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'منوی اصلی' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps admin drawer links touch-sized and active on a nested route', async () => {
    navigation.pathname = '/admin/registrations/42';
    const user = userEvent.setup();
    render(<AdminShell>content</AdminShell>);

    await user.click(screen.getByRole('button', { name: 'باز کردن منوی مدیریت' }));
    const dialog = screen.getByRole('dialog', { name: 'پنل مدیریت' });
    const nav = within(dialog).getByRole('navigation', { name: 'ناوبری پنل مدیریت' });
    const registration = within(nav).getByRole('link', { name: 'ثبت‌نام‌ها' });
    expect(registration).toHaveClass('min-h-11');
    expect(registration).toHaveAttribute('aria-current', 'page');
    expect(within(dialog).getByRole('button', { name: 'بستن' })).toHaveClass('size-11');
  });

  it('uses segment-aware route matching instead of prefix collisions', () => {
    expect(isPublicRouteActive('/services/routes', '/services')).toBe(true);
    expect(isPublicRouteActive('/services-old', '/services')).toBe(false);
    expect(isAdminRouteActive('/admin/reports/annual/', '/admin/reports')).toBe(true);
    expect(isAdminRouteActive('/admin/reporting', '/admin/reports')).toBe(false);
    expect(
      isAdminRouteActive('/admin/notifications/broadcasts', '/admin/notifications', true),
    ).toBe(false);
  });

  it('keeps shared compact buttons at the 44px touch-target contract', () => {
    render(<Button size="sm">عملیات فشرده با برچسب طولانی</Button>);
    expect(screen.getByRole('button')).toHaveClass('min-h-11');
  });
});
