import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverEnrollmentForm } from './driver-enrollment-form';
import { setOnboardingState } from '@/features/auth/onboarding-session';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

describe('driver enrollment input behavior', () => {
  beforeEach(() => {
    setOnboardingState({
      sessionId: 'session',
      phoneNumber: '09123456789',
      nationalId: '0084575948',
      expiresAt: '2030-01-01T00:00:00.000Z',
      currentStep: 'DRIVER_ENROLLMENT',
    });
  });

  it('does not retain Latin letters, numbers, or symbols in name inputs', async () => {
    const user = userEvent.setup();
    render(<DriverEnrollmentForm />);
    const firstName = screen.getByLabelText('نام');
    await user.type(firstName, 'Ali12@علی');
    expect(firstName).toHaveValue('علی');
  });

  it('immediately reports secondary and emergency mobiles matching the primary mobile', async () => {
    const user = userEvent.setup();
    render(<DriverEnrollmentForm />);
    const secondary = screen.getByLabelText('شماره همراه دوم');
    const emergency = screen.getByLabelText('شماره تماس اضطراری');
    await user.clear(secondary);
    await user.type(secondary, '09123456789');
    await user.clear(emergency);
    await user.type(emergency, '09123456789');
    expect(
      screen.getByText('شماره همراه دوم نباید با شماره همراه اول یکسان باشد.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('شماره تماس اضطراری نباید با شماره همراه اول یکسان باشد.'),
    ).toBeInTheDocument();
  });
});
