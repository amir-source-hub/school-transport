import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PaymentReturnPreview } from './payment-return-preview';

describe('PaymentReturnPreview', () => {
  it('starts pending and exposes every documented return state without initiating payment', async () => {
    const user = userEvent.setup();

    render(<PaymentReturnPreview />);

    expect(screen.getByText('نتیجه پرداخت هنوز قطعی نیست')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'در انتظار تأیید' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'موفق و تأییدشده' }));
    expect(screen.getByText('پرداخت توسط سرور تأیید شد')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ناموفق' }));
    expect(screen.getByText('پرداخت تکمیل نشد')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'لغوشده' }));
    expect(screen.getByText('پرداخت لغو شد')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'قبلاً پرداخت‌شده' }));
    expect(screen.getByText('این فاکتور قبلاً تکمیل شده است')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
