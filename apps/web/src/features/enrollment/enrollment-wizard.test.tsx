import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { EnrollmentWizard } from './enrollment-wizard';

describe('EnrollmentWizard', () => {
  it('validates the student step, advances, and preserves values when returning', async () => {
    const user = userEvent.setup();
    render(<EnrollmentWizard />);

    await user.click(screen.getByRole('button', { name: 'ادامه به اطلاعات مدرسه' }));
    expect(screen.getByText('نام دانش‌آموز را وارد کنید.')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /نام$/ }), 'علی');
    await user.type(screen.getByRole('textbox', { name: /نام خانوادگی/ }), 'نمونه');
    await user.type(screen.getByRole('textbox', { name: /کد ملی/ }), '۰۰۱۳۵۴۷۸۳۶');
    await user.type(screen.getByLabelText(/تاریخ تولد/), '2015-09-12');
    await user.selectOptions(screen.getByLabelText(/جنسیت/), 'پسر');
    await user.selectOptions(screen.getByLabelText(/پایه تحصیلی/), 'هفتم');
    await user.click(screen.getByRole('button', { name: 'ادامه به اطلاعات مدرسه' }));

    expect(screen.getByText('اطلاعات مرحله اول حفظ شده است.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'بازگشت و ویرایش' }));
    expect(screen.getByRole('textbox', { name: /نام$/ })).toHaveValue('علی');
  });
});
