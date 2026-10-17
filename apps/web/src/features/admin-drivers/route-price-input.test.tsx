import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoutePriceInput, tomanToRials } from './route-price-input';

describe('route price in tomans', () => {
  it('groups digits and converts the displayed toman amount to stored rials', () => {
    render(<RoutePriceInput />);
    const input = screen.getByRole('textbox', { name: 'مبلغ ماهانه قرارداد به تومان' });
    fireEvent.change(input, { target: { value: '۹۰۰۰۰۰۰' } });
    expect(input).toHaveValue('9,000,000');
    expect(tomanToRials((input as HTMLInputElement).value)).toBe(90_000_000);
  });

  it('shows an existing rial price as grouped tomans for editing', () => {
    render(<RoutePriceInput defaultRials={90_000_000} />);
    expect(screen.getByRole('textbox', { name: 'مبلغ ماهانه قرارداد به تومان' })).toHaveValue(
      '9,000,000',
    );
  });
});
