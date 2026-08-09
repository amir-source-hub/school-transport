import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotificationsPage from './page';
import { getAdminNotifications } from '@/features/admin-notifications/admin-notifications-api';

vi.mock('@/features/admin-notifications/admin-notifications-api', () => ({
  getAdminNotifications: vi.fn(),
}));

describe('admin operational notification cursor paging', () => {
  it('keeps the original snapshot and filters in the older-events link', async () => {
    vi.mocked(getAdminNotifications).mockResolvedValue({
      total: 3,
      pageSize: 2,
      snapshotAt: '2026-08-09T12:00:00.000Z',
      nextCursor: 'stable-cursor',
      items: [
        {
          id: 'notification-1',
          eventId: 'event-1',
          notificationType: 'LIMIT_REQUEST_CREATED',
          title: 'درخواست جدید',
          message: 'یک درخواست ثبت شد.',
          notificationStatus: 'SENT',
          eventTime: new Date('2026-08-09T10:00:00.000Z'),
          route: '/admin/students',
        },
      ],
    });

    render(
      await NotificationsPage({
        searchParams: Promise.resolve({ type: 'LIMIT_REQUEST_CREATED', status: 'SENT' }),
      }),
    );

    expect(getAdminNotifications).toHaveBeenCalledWith({
      cursor: undefined,
      snapshotAt: undefined,
      pageSize: 20,
      type: 'LIMIT_REQUEST_CREATED',
      status: 'SENT',
      dateFrom: undefined,
      dateTo: undefined,
    });
    const next = screen.getByRole('link', { name: 'رویدادهای قدیمی‌تر' });
    expect(next).toHaveAttribute('href', expect.stringContaining('cursor=stable-cursor'));
    expect(next).toHaveAttribute(
      'href',
      expect.stringContaining('snapshotAt=2026-08-09T12%3A00%3A00.000Z'),
    );
    expect(next).toHaveAttribute('href', expect.stringContaining('type=LIMIT_REQUEST_CREATED'));
  });

  it('does not render a paging control at the end of the snapshot', async () => {
    vi.mocked(getAdminNotifications).mockResolvedValue({
      items: [],
      total: 0,
      pageSize: 20,
      snapshotAt: '2026-08-09T12:00:00.000Z',
      nextCursor: null,
    });
    render(await NotificationsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole('navigation', { name: 'صفحه‌بندی رویدادها' })).toBeNull();
  });
});
