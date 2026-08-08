import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateEnrollmentForm, WizardFooter } from './enrollment-actions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('CreateEnrollmentForm inline validation', () => {
  it('shows and clears a mobile-number error directly below the edited field without submitting', async () => {
    const user = userEvent.setup();
    render(
      <CreateEnrollmentForm
        schools={[
          {
            id: 'school-1',
            name: 'مدرسه نمونه',
            city: 'تهران',
            educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }],
          },
        ]}
        savedParents={{ father: null, mother: null }}
        existingStudents={[]}
        defaults={{}}
      />,
    );

    const fatherSection = screen.getByRole('heading', { name: 'اطلاعات پدر' }).closest('section');
    expect(fatherSection).not.toBeNull();
    const phone = within(fatherSection!).getByLabelText('شماره همراه');

    await user.type(phone, '0912');

    const error = within(fatherSection!).getByText(
      'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
    );
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone.getAttribute('aria-describedby')).toBe(error.id);
    expect(phone.nextElementSibling).toBe(error);

    await user.clear(phone);
    await user.type(phone, '09123456789');

    expect(phone).toHaveAttribute('aria-invalid', 'false');
    expect(
      within(fatherSection!).queryByText('شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.'),
    ).not.toBeInTheDocument();
  });

  it('announces progress and links a submit summary to the first invalid field', async () => {
    const user = userEvent.setup();
    render(
      <CreateEnrollmentForm
        schools={[
          {
            id: 'school-1',
            name: 'مدرسه نمونه',
            city: 'تهران',
            educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }],
          },
        ]}
        savedParents={{ father: null, mother: null }}
        existingStudents={[]}
        defaults={{}}
      />,
    );

    const progress = screen.getByRole('list', { name: 'مراحل ثبت‌نام' });
    expect(within(progress).getByText('مشخصات').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await user.click(screen.getByRole('button', { name: /مرحله بعد/ }));

    const summary = screen.getByRole('alert');
    expect(within(summary).getByText('لطفاً خطاهای زیر را اصلاح کنید:')).toBeInTheDocument();
    expect(within(summary).getByRole('link', { name: /نام دانش‌آموز/ })).toHaveAttribute(
      'href',
      '#enrollment-studentFirst',
    );
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'نام دانش‌آموز' })).toHaveFocus(),
    );
  });

  it('keeps mobile wizard actions full width and disables repeat submission while pending', () => {
    render(<WizardFooter onBack={vi.fn()} pending submitLabel="ثبت درخواست" />);

    const submit = screen.getByRole('button', { name: /ثبت درخواست/ });
    const back = screen.getByRole('button', { name: /مرحله قبل/ });
    expect(submit).toBeDisabled();
    expect(back).toBeDisabled();
    expect(submit).toHaveClass('w-full');
    expect(back).toHaveClass('w-full');
  });
});
