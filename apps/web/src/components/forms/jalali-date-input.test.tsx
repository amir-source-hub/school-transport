import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { JalaliDateInput } from './jalali-date-input';

describe('JalaliDateInput', () => {
  it('adds date separators while accepting Persian digits from a numeric keyboard', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<JalaliDateInput id="birth-date" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'numeric');

    await user.type(input, '۱۴۰۳۰۷۱۵');

    expect(input).toHaveValue('1403/07/15');
    expect(onChange).toHaveBeenLastCalledWith('2024-10-06');
  });

  it('shows an inline error until a complete valid date has been entered', async () => {
    const user = userEvent.setup();
    render(<JalaliDateInput value="" onChange={vi.fn()} />);

    await user.type(screen.getByRole('textbox'), '140313');

    expect(screen.getByText('تاریخ شمسی را به شکل ۱۴۰۵/۰۱/۰۱ وارد کنید.')).toBeInTheDocument();
  });
});

