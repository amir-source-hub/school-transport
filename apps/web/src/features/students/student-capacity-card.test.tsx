import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StudentCapacityCard } from './student-capacity-card';

const getStudentCapacity = vi.hoisted(() => vi.fn());
const getLimitRequests = vi.hoisted(() => vi.fn());
const createLimitRequest = vi.hoisted(() => vi.fn());

vi.mock('./students-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./students-api')>();
  return { ...original, getStudentCapacity, getLimitRequests, createLimitRequest };
});

function request(overrides: Record<string, unknown>) {
  return {
    id: 'request-1',
    userId: 'account-1',
    currentLimit: 2,
    requestedLimit: 3,
    reason: 'فرزند دیگری اضافه شده است',
    status: 'PENDING',
    reviewedByAdminId: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('StudentCapacityCard', () => {
  it('renders capacity usage without a request form when below the limit', async () => {
    getStudentCapacity.mockResolvedValue({ studentLimit: 2, activeStudentCount: 1, remaining: 1 });
    getLimitRequests.mockResolvedValue([]);

    render(<StudentCapacityCard />);

    expect(await screen.findByText(/۱ از ۲/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /ثبت درخواست افزایش ظرفیت/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the increase form at capacity and submits the reason', async () => {
    getStudentCapacity.mockResolvedValue({ studentLimit: 2, activeStudentCount: 2, remaining: 0 });
    getLimitRequests.mockResolvedValue([]);
    createLimitRequest.mockResolvedValue(request({}));
    const user = userEvent.setup();

    render(<StudentCapacityCard />);

    const textbox = await screen.findByLabelText(/دلیل نیاز به دانش‌آموز بیشتر/);
    await user.type(textbox, 'فرزند دیگری اضافه شده است');
    await user.click(screen.getByRole('button', { name: 'ثبت درخواست افزایش ظرفیت' }));

    await waitFor(() =>
      expect(createLimitRequest).toHaveBeenCalledWith('فرزند دیگری اضافه شده است'),
    );
  });

  it('shows the pending status and hides the form when a request is awaiting review', async () => {
    getStudentCapacity.mockResolvedValue({ studentLimit: 2, activeStudentCount: 2, remaining: 0 });
    getLimitRequests.mockResolvedValue([request({})]);

    render(<StudentCapacityCard />);

    expect(await screen.findByText('در انتظار بررسی')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'ثبت درخواست افزایش ظرفیت' }),
    ).not.toBeInTheDocument();
  });

  it('shows the Persian rejection reason and allows a new request', async () => {
    getStudentCapacity.mockResolvedValue({ studentLimit: 2, activeStudentCount: 2, remaining: 0 });
    getLimitRequests.mockResolvedValue([
      request({ status: 'REJECTED', rejectionReason: 'مدارک کافی نیست' }),
    ]);

    render(<StudentCapacityCard />);

    expect(await screen.findByText('رد شده')).toBeInTheDocument();
    expect(screen.getByText(/دلیل رد: مدارک کافی نیست/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ثبت درخواست افزایش ظرفیت' })).toBeInTheDocument();
  });
});
