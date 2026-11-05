import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnlinePaymentButton } from './online-payment-button';

vi.mock('./payments-api', () => ({ startOnlinePayment: vi.fn() }));

describe('OnlinePaymentButton', () => {
  it('offers online payment', () => {
    render(<OnlinePaymentButton scheduleItemId="item-1" amount={4_000_000} />);

    const button = screen.getByRole('button', { name: 'پرداخت آنلاین' });
    expect(button).toBeEnabled();
  });
});
