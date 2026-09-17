import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EnrollmentTutorialVideo } from './enrollment-tutorial-video';

describe('EnrollmentTutorialVideo', () => {
  it('shows the student enrollment tutorial from public object storage', () => {
    vi.stubEnv('NEXT_PUBLIC_ASSET_BASE_URL', 'https://assets.example.test/public/site/release-123');
    const { container } = render(<EnrollmentTutorialVideo role="STUDENT_PORTAL" />);

    expect(screen.getByRole('heading', { name: 'ویدیوی راهنمای ثبت‌نام دانش‌آموز' })).toBeVisible();
    expect(container.querySelector('source')).toHaveAttribute(
      'src',
      'https://assets.example.test/public/site/release-2026-09-17/videos/Screenrecorder-2026-09-17-17-04-26-472.mp4',
    );
  });

  it('shows the driver tutorial and omits tutorials for school managers', () => {
    const { container, rerender } = render(<EnrollmentTutorialVideo role="DRIVER_PORTAL" />);

    expect(screen.getByRole('heading', { name: 'ویدیوی راهنمای ثبت‌نام راننده' })).toBeVisible();
    expect(container.querySelector('source')).toHaveAttribute(
      'src',
      expect.stringContaining('Screenrecorder-2026-09-17-17-14-02-595.mp4'),
    );

    rerender(<EnrollmentTutorialVideo role="SCHOOL_MANAGER" />);
    expect(container).toBeEmptyDOMElement();
  });
});
