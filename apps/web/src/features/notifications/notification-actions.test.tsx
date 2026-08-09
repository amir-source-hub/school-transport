import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkAllReadButton, MarkReadButton } from './notification-actions';
import { markAllNotificationsRead, markNotificationRead } from './notifications-api';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./notifications-api', () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

describe('notification actions', () => {
  beforeEach(() => {
    vi.mocked(markNotificationRead).mockReset();
    vi.mocked(markAllNotificationsRead).mockReset();
    refresh.mockReset();
  });

  it('marks one notification from the keyboard and refreshes the unread state', async () => {
    vi.mocked(markNotificationRead).mockResolvedValue(undefined);
    render(<MarkReadButton id="notification-1" />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'خواندم' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(markNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('marks all notifications and prevents duplicate submission while pending', async () => {
    let resolve!: () => void;
    vi.mocked(markAllNotificationsRead).mockImplementation(
      () => new Promise<void>((done) => (resolve = done)),
    );
    render(<MarkAllReadButton />);
    const button = screen.getByRole('button', { name: 'خواندن همه' });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    resolve();
  });

  it('announces a recoverable API error and re-enables retry', async () => {
    vi.mocked(markNotificationRead).mockRejectedValue(new Error('network unavailable'));
    render(<MarkReadButton id="notification-1" />);
    const button = screen.getByRole('button', { name: 'خواندم' });
    await userEvent.click(button);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
