import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FamilyProfileForm } from './family-profile-form';

describe('FamilyProfileForm', () => {
  it('validates mobile input, preserves edits, and confirms only the demo save', async () => {
    const user = userEvent.setup();
    render(<FamilyProfileForm />);

    const emergencyMobile = screen.getByRole('textbox', {
      name: 'شماره همراه تماس اضطراری',
    });
    await user.clear(emergencyMobile);
    await user.type(emergencyMobile, '۱۲۳');
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات نمایشی' }));

    expect(screen.getByText('شماره همراه معتبر وارد کنید.')).toBeInTheDocument();
    expect(emergencyMobile).toHaveValue('۱۲۳');

    await user.clear(emergencyMobile);
    await user.type(emergencyMobile, '۰۹۱۲۰۰۰۰۰۰۳');
    await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات نمایشی' }));

    expect(await screen.findByText('تغییرات نمایشی ذخیره شد')).toBeInTheDocument();
  });
});
