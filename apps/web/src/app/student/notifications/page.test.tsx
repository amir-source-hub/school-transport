import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage, { NotificationsSkeleton } from './page';
import {
  getNotifications,
  getNotificationSettings,
} from '@/features/notifications/notifications-api';

vi.mock('@/features/notifications/notifications-api', () => ({
  getNotifications: vi.fn(),
  getNotificationSettings: vi.fn(),
}));
vi.mock('@/features/notifications/notification-settings-form', () => ({
  NotificationSettingsForm: () => <section aria-label="تنظیمات اعلان" />,
}));
vi.mock('@/features/notifications/notification-actions', () => ({
  MarkAllReadButton: () => <button>خواندن همه</button>,
  MarkReadButton: () => <button>خواندم</button>,
}));

const settings = {
  textVersion: 'v1',
  consentText: 'متن رضایت',
  serviceNotices: { inApp: true, sms: true, configurable: false },
  optionalUpdates: { inApp: false, sms: false },
};

describe('student notification page states', () => {
  beforeEach(() => {
    vi.mocked(getNotificationSettings).mockResolvedValue(settings);
  });

  it('exposes an accessible loading state', () => {
    render(<NotificationsSkeleton />);
    expect(screen.getByLabelText('در حال بارگذاری اعلان‌ها')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the empty state without read actions', async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      snapshotAt: '2026-08-09T12:00:00.000Z',
    });
    render(await NotificationsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/اعلانی برای حساب شما ثبت نشده است/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'خواندن همه' })).not.toBeInTheDocument();
  });

  it('distinguishes unread state and exposes keyboard-native actions and responsive wrapping', async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 20,
      snapshotAt: '2026-08-09T12:00:00.000Z',
      items: [
        {
          id: 'notification-1',
          eventId: 'event-1',
          notificationType: 'ENROLLMENT_APPROVED',
          channel: 'IN_APP',
          purpose: 'SERVICE_NOTICE',
          title: 'ثبت‌نام تأیید شد',
          message: 'جزئیات در پنل قابل مشاهده است.',
          relatedEntityType: 'REGISTRATION',
          relatedEntityId: null,
          notificationStatus: 'SENT',
          readAt: null,
          sentAt: new Date('2026-08-09T10:00:00Z'),
          createdAt: new Date('2026-08-09T10:00:00Z'),
          updatedAt: new Date('2026-08-09T10:00:00Z'),
          route: '/student/dashboard',
        },
      ],
    });
    const { container } = render(
      await NotificationsPage({ searchParams: Promise.resolve({ page: '1' }) }),
    );
    expect(screen.getByText('خوانده‌نشده')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'خواندم' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'مشاهده جزئیات' })).toHaveAttribute(
      'href',
      '/student/dashboard',
    );
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
  });
});
