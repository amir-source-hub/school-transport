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

  it('prevents impossible segment values before they enter the fields', async () => {
    const user = userEvent.setup();
    render(
      <JalaliDateInput value="" onChange={vi.fn()} maxDate="2026-08-11" minDate="1900-01-01" />,
    );

    const year = screen.getByLabelText('سال');
    const month = screen.getByLabelText('ماه');
    const day = screen.getByLabelText('روز');
    await user.type(year, '1299');
    expect(year).toHaveValue('129');
    await user.clear(year);
    await user.type(year, '1405');
    await user.type(month, '13');
    expect(month).toHaveValue('1');
    await user.clear(month);
    await user.type(month, '07');
    await user.type(day, '32');
    expect(day).toHaveValue('3');
  });

  it('reports dates outside the configured policy range', async () => {
    const { rerender } = render(
      <JalaliDateInput value="" onChange={vi.fn()} maxDate="2026-08-11" minDate="1900-01-01" />,
    );

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

  it('selects a valid Persian date from the calendar', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <JalaliDateInput value="" onChange={onChange} minDate="2024-03-20" maxDate="2025-03-20" />,
    );

    await user.click(screen.getByText('انتخاب از تقویم شمسی'));
    expect(screen.getByRole('group', { name: 'تاریخ شمسی' }).parentElement).toHaveClass(
      'min-h-[22rem]',
    );
    await user.selectOptions(screen.getByLabelText('ماه تقویم'), '7');
    await user.click(screen.getByRole('button', { name: '۱۵' }));

    expect(onChange).toHaveBeenLastCalledWith('2024-10-06');
    expect(screen.getByLabelText('سال')).toHaveValue('1403');
    expect(screen.getByLabelText('ماه')).toHaveValue('07');
    expect(screen.getByLabelText('روز')).toHaveValue('15');
  });
});
