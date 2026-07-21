import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EnrollmentReadiness } from './enrollment-readiness';

describe('EnrollmentReadiness', () => {
  it('explains the documentation gate without exposing a premature form', () => {
    const { container } = render(<EnrollmentReadiness />);

    expect(screen.getByText('پیاده‌سازی نهایی ثبت‌نام مسدود است')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ایجاد پیش‌نویس پس از تصویب سند' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ادامه ثبت‌نام پس از اتصال API' })).toBeDisabled();
    expect(container.querySelector('form')).not.toBeInTheDocument();
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });
});
