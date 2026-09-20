import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DriverShell, isDriverRouteActive } from './driver-shell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/driver/vehicle-documents',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/auth/logout-menu-item', () => ({
  LogoutMenuItem: () => <button>خروج</button>,
}));

describe('DriverShell', () => {
  it('shows the requested four mobile destinations in order and keeps all sidebar destinations', () => {
    render(
      <DriverShell>
        <p>محتوا</p>
      </DriverShell>,
    );
    const dock = within(screen.getByRole('navigation', { name: 'ناوبری سریع راننده' }));
    expect(dock.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'مدارک خودروی من',
      'خانه',
      'مدارک شخصی من',
      'سرویس‌ها',
    ]);
    expect(dock.getByRole('link', { name: 'مدارک خودروی من' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(dock.queryByRole('link', { name: 'دانش‌آموزان' })).not.toBeInTheDocument();
    expect(dock.queryByRole('link', { name: 'اطلاعات من' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'دانش‌آموزان' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'مدارس من' }).length).toBeGreaterThan(0);
    expect(screen.getByText('محتوا')).toBeInTheDocument();
  });

  it('marks nested document pages active in the mobile dock', () => {
    expect(
      isDriverRouteActive('/driver/personal-documents/letters/addiction', '/driver/personal-documents'),
    ).toBe(true);
    expect(isDriverRouteActive('/driver/vehicle-documents', '/driver/personal-documents')).toBe(
      false,
    );
  });
});
