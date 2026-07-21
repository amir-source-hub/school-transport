import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { demoStudentDashboards } from './mock-parent-dashboard';
import { ParentDashboard } from './parent-dashboard';

describe('ParentDashboard', () => {
  it("keeps each student's dashboard data isolated while switching", async () => {
    const user = userEvent.setup();
    render(<ParentDashboard students={demoStudentDashboards} />);

    expect(screen.getByText('درخواست نمونه برای بررسی ارسال شده است.')).toBeInTheDocument();
    expect(screen.queryByText('درخواست نمونه نیازمند اصلاح است.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'دانش‌آموز نمونه دو' }));

    expect(screen.getByRole('button', { name: 'دانش‌آموز نمونه دو' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('درخواست نمونه نیازمند اصلاح است.')).toBeInTheDocument();
    expect(screen.queryByText('درخواست نمونه برای بررسی ارسال شده است.')).not.toBeInTheDocument();
  });
});
