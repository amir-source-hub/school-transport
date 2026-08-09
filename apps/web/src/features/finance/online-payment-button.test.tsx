import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnlinePaymentButton } from './online-payment-button';

describe('OnlinePaymentButton', () => {
  it('keeps the unavailable choice visible and explains it accessibly', () => {
    render(<OnlinePaymentButton scheduleItemId="item-1" amount={4_000_000} />);

    const button = screen.getByRole('button', { name: 'پرداخت آنلاین' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/به‌زودی فعال می‌شود/)).toBeInTheDocument();
  });
});
