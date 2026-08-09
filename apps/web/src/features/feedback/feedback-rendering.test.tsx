import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFeedbackList } from './admin-feedback-list';
import { FeedbackList } from './feedback-list';
import type { Feedback } from './feedback-api';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const dangerous = '<img src=x onerror=alert(1)><script>alert(2)</script>';
const item: Feedback = {
  id: 'feedback-1',
  studentId: null,
  category: 'APP',
  subject: dangerous,
  message: `\u202e${dangerous}\u202c`,
  status: 'ANSWERED',
  priority: 'NORMAL',
  assigneeId: null,
  response: `&lt;b&gt;${dangerous}&lt;/b&gt;`,
  version: 2,
  createdAt: new Date('2026-08-09T10:00:00Z'),
  respondedAt: new Date('2026-08-09T11:00:00Z'),
};

describe('feedback rendering safety', () => {
  beforeEach(() => refresh.mockReset());

  it.each([
    ['student', (value: Feedback[]) => <FeedbackList items={value} />],
    ['admin', (value: Feedback[]) => <AdminFeedbackList items={value} />],
  ])('renders legacy hostile content as inert text in the %s context', (_name, component) => {
    const { container } = render(component([item]));
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain(dangerous);
  });
});
