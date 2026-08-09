import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackForm } from './feedback-form';
import { AdminFeedbackList } from './admin-feedback-list';
import { createFeedback, feedbackAction, type Feedback } from './feedback-api';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./feedback-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./feedback-api')>();
  return { ...actual, createFeedback: vi.fn(), feedbackAction: vi.fn() };
});

const item: Feedback = {
  id: 'feedback-1',
  studentId: null,
  category: 'APP',
  subject: 'موضوع فارسی بسیار طولانی '.repeat(8),
  message: 'متن پیام فارسی بسیار طولانی '.repeat(20),
  status: 'NEW',
  priority: 'NORMAL',
  assigneeId: null,
  response: null,
  version: 1,
  createdAt: new Date('2026-08-09T10:00:00Z'),
  respondedAt: null,
};

describe('feedback interaction accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses native required/minimum validation and exposes keyboard-focusable fields', async () => {
    render(<FeedbackForm />);
    const subject = screen.getByRole('textbox', { name: 'موضوع' });
    const message = screen.getByRole('textbox', { name: 'متن پیام' });
    expect(subject).toBeRequired();
    expect(subject).toHaveAttribute('minlength', '3');
    expect(message).toBeRequired();
    await userEvent.tab();
    expect(screen.getByRole('combobox', { name: 'دسته‌بندی' })).toHaveFocus();
  });

  it('prevents duplicate submission and announces success', async () => {
    let resolve!: () => void;
    vi.mocked(createFeedback).mockImplementation(
      () => new Promise<void>((done) => (resolve = done)) as never,
    );
    const user = userEvent.setup();
    render(<FeedbackForm />);
    await user.type(screen.getByRole('textbox', { name: 'موضوع' }), 'موضوع معتبر');
    await user.type(screen.getByRole('textbox', { name: 'متن پیام' }), 'متن پیام معتبر برای ثبت');
    const submit = screen.getByRole('button', { name: 'ثبت پیام' });
    await user.click(submit);
    fireEvent.submit(submit.closest('form')!);
    expect(createFeedback).toHaveBeenCalledOnce();
    expect(submit).toBeDisabled();
    resolve();
    expect(await screen.findByRole('status')).toHaveTextContent('پیام شما ثبت شد');
  });

  it('announces an error and permits a retry', async () => {
    vi.mocked(createFeedback)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined as never);
    const user = userEvent.setup();
    render(<FeedbackForm />);
    await user.type(screen.getByRole('textbox', { name: 'موضوع' }), 'موضوع معتبر');
    await user.type(screen.getByRole('textbox', { name: 'متن پیام' }), 'متن پیام معتبر برای ثبت');
    const submit = screen.getByRole('button', { name: 'ثبت پیام' });
    await user.click(submit);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(createFeedback).toHaveBeenCalledTimes(2));
  });

  it('wraps long RTL content and blocks concurrent admin actions', async () => {
    let resolve!: () => void;
    vi.mocked(feedbackAction).mockImplementation(
      () => new Promise<void>((done) => (resolve = done)) as never,
    );
    const user = userEvent.setup();
    const { container } = render(<AdminFeedbackList items={[item]} />);
    expect(container.querySelector('.break-words')).not.toBeNull();
    expect(container.querySelector('.flex-wrap')).not.toBeNull();
    const close = screen.getByRole('button', { name: 'بستن' });
    await user.click(close);
    expect(close).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'خوانده شد' }));
    expect(feedbackAction).toHaveBeenCalledOnce();
    resolve();
    expect(await screen.findByRole('status')).toHaveTextContent('عملیات انجام شد');
  });
});
