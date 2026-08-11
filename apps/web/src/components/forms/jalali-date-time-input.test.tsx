import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JalaliDateTimeInput } from './jalali-date-time-input';

describe('JalaliDateTimeInput', () => {
  it('shows a Jalali date with a separate time and preserves the local payload shape', async () => {
    const onChange = vi.fn();
    render(
      <JalaliDateTimeInput
        label="زمان ارسال (تهران)"
        value="2026-08-11T22:18"
        onChange={onChange}
        required
      />,
    );

    expect(screen.getByLabelText('سال')).toHaveValue('1405');
    expect(screen.getByLabelText('ماه')).toHaveValue('05');
    expect(screen.getByLabelText('روز')).toHaveValue('20');
    expect(screen.getByLabelText('ساعت')).toHaveValue('22:18');
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();

    fireEvent.change(screen.getByLabelText('ساعت'), { target: { value: '23:10' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-08-11T23:10');
  });
});
