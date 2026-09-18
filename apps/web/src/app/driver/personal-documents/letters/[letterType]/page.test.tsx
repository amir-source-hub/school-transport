import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('@/features/driver/driver-api', () => ({
  getDriverProfile: vi.fn(async () => ({
    driver: {
      firstName: 'علی',
      lastName: 'رضایی',
      fatherName: 'حسن',
      nationalId: '0084575948',
    },
    vehicle: null,
  })),
}));
vi.mock('@/features/driver/print-letter', () => ({
  PrintLetterButton: ({ label }: { label: string }) => <button>{label}</button>,
}));
vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

describe('driver addiction-test letter', () => {
  it('uses the supplied company letter and fills the available driver identity', async () => {
    render(await Page({ params: Promise.resolve({ letterType: 'addiction' }) }));
    expect(screen.getByText('مدیریت محترم آزمایشگاه')).toBeInTheDocument();
    expect(screen.getByText('علی رضایی')).toBeInTheDocument();
    expect(screen.getByText('حسن')).toBeInTheDocument();
    expect(screen.getByText('0084575948')).toBeInTheDocument();
    expect(screen.queryByText(/محل درج متن نهایی نامه/)).not.toBeInTheDocument();
  });
});
