import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentReturnResult } from './payment-return-result';

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
const confirmReturnedOnlinePayment = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams('txId=transaction-1&trackId=123456&mode=panel'),
}));
vi.mock('./payments-api', () => ({ confirmReturnedOnlinePayment }));

describe('online payment return', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('confirms through the public server endpoint and shows the panel return link', async () => {
    confirmReturnedOnlinePayment.mockResolvedValue(undefined);
    render(<PaymentReturnResult />);
    expect(confirmReturnedOnlinePayment).toHaveBeenCalledWith('transaction-1', '123456');
    expect(await screen.findByText(/پرداخت تأیید و ثبت شد/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'بازگشت به پرداخت‌ها' })).toHaveAttribute('href', '/student/payments');
  });

  it('does not claim success when server verification fails', async () => {
    confirmReturnedOnlinePayment.mockRejectedValue(new Error('verification failed'));
    render(<PaymentReturnResult />);
    expect(await screen.findByText(/پرداخت تأیید نشد/)).toBeInTheDocument();
  });
});
