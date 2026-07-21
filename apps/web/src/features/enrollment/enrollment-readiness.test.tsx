import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnrollmentReadiness } from './enrollment-readiness';

describe('EnrollmentReadiness', () => {
  it('shows the approved specification state without exposing an unfinished form', () => {
    const { container } = render(<EnrollmentReadiness />);

    expect(screen.getByText('مشخصات فرم ثبت‌نام دریافت شد')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فرم چندمرحله‌ای در حال توسعه' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ارسال واقعی پس از تثبیت API' })).toBeDisabled();
    expect(container.querySelector('form')).not.toBeInTheDocument();
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });
});
