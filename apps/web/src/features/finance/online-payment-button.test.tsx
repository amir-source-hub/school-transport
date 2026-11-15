import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnlinePaymentButton } from './online-payment-button';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock('./payments-api', () => ({ startOnlinePayment: vi.fn() }));

describe('OnlinePaymentButton', () => {
  it('offers online payment', () => {
    render(<OnlinePaymentButton scheduleItemId="item-1" amount={4_000_000} />);

    const button = screen.getByRole('button', { name: 'پرداخت آنلاین' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'تأیید مبلغ پرداخت' })).toBeInTheDocument();
    expect(screen.getByText('جمع قابل پرداخت')).toBeInTheDocument();
  });
});
