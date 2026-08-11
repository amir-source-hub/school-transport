import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JalaliDateInput } from './jalali-date-input';

describe('JalaliDateInput', () => {
  it('uses constrained LTR year/month/day segments and auto-advances', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<JalaliDateInput label="تاریخ تولد" value="" onChange={onChange} />);

    const year = screen.getByLabelText('سال');
    const month = screen.getByLabelText('ماه');
    const day = screen.getByLabelText('روز');
    expect(screen.getByRole('group', { name: 'تاریخ تولد' })).toHaveAttribute('dir', 'ltr');
    expect(year).toHaveAttribute('inputmode', 'numeric');

    await user.type(year, '۱۴۰۳');
    expect(month).toHaveFocus();
    await user.type(month, '۰۷');
    expect(day).toHaveFocus();
    await user.type(day, '۱۵');

    expect(year).toHaveValue('1403');
    expect(month).toHaveValue('07');
    expect(day).toHaveValue('15');
    expect(onChange).toHaveBeenLastCalledWith('2024-10-06');
    expect(screen.getByText(/تاریخ انتخاب‌شده/)).toHaveTextContent('1403/07/15');
  });

  it('distributes a pasted complete date and normalizes Arabic digits', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<JalaliDateInput value="" onChange={onChange} />);

    await user.click(screen.getByLabelText('سال'));
    await user.paste('١٤٠٥/٠١/٠١');

    expect(screen.getByLabelText('سال')).toHaveValue('1405');
    expect(screen.getByLabelText('ماه')).toHaveValue('01');
    expect(screen.getByLabelText('روز')).toHaveValue('01');
    expect(onChange).toHaveBeenLastCalledWith('2026-03-21');
  });

  it('rejects impossible, future, and out-of-policy dates with specific messages', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <JalaliDateInput value="" onChange={vi.fn()} maxDate="2026-08-11" minDate="1900-01-01" />,
    );

    await user.type(screen.getByLabelText('سال'), '1405');
    await user.type(screen.getByLabelText('ماه'), '13');
    await user.type(screen.getByLabelText('روز'), '01');
    expect(screen.getByText(/تاریخ شمسی معتبر/)).toBeInTheDocument();

    rerender(
      <JalaliDateInput
        value="2027-03-21"
        onChange={vi.fn()}
        maxDate="2026-08-11"
        minDate="1900-01-01"
      />,
    );
    expect(await screen.findByText('تاریخ نمی‌تواند در آینده باشد.')).toBeInTheDocument();
  });

  it('moves backward on backspace without trapping keyboard focus', async () => {
    const user = userEvent.setup();
    render(<JalaliDateInput value="" onChange={vi.fn()} />);
    const month = screen.getByLabelText('ماه');
    month.focus();
    await user.keyboard('{Backspace}');
    expect(screen.getByLabelText('سال')).toHaveFocus();
  });
});
