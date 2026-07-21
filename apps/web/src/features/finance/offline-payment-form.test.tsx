import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { OfflinePaymentForm } from './offline-payment-form';

describe('OfflinePaymentForm', () => {
  it('preserves invalid values and only confirms a pending mock submission', async () => {
    const user = userEvent.setup();
    render(<OfflinePaymentForm />);

    const reference = screen.getByRole('textbox', { name: 'شماره مرجع' });
    await user.type(reference, 'x');
    await user.click(screen.getByRole('button', { name: 'ارسال نمایشی برای بررسی' }));

    expect(screen.getByText('تاریخ و زمان پرداخت را وارد کنید.')).toBeInTheDocument();
    expect(screen.getByText('شماره مرجع معتبر وارد کنید.')).toBeInTheDocument();
    expect(reference).toHaveValue('x');

    await user.type(reference, 'yz');
    await user.type(screen.getByLabelText(/تاریخ و زمان پرداخت/), '2026-10-01T10:30');
    await user.click(screen.getByRole('button', { name: 'ارسال نمایشی برای بررسی' }));

    expect(await screen.findByText('جزئیات نمایشی در انتظار بررسی قرار گرفت')).toBeInTheDocument();
    expect(screen.getByText(/پرداخت هنوز تأییدشده یا پرداخت‌شده نیست/)).toBeInTheDocument();
  });
});
