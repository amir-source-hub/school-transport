import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContractReview } from './contract-review';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('./contracts-api', () => ({ acceptContract: vi.fn(), rejectContract: vi.fn() }));

describe('ContractReview', () => {
  it('requires all three pages in order and restores the reviewed page', async () => {
    const user = userEvent.setup();
    const props = {
      contractId: 'contract-1',
      version: 1,
      templateHash: 'hash-1',
      pages: [['one'], ['two'], ['three']],
      canAct: true,
    };
    const { unmount } = render(<ContractReview {...props} />);
    expect(screen.getByText('صفحه ۱ از ۳')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'پذیرش قرارداد' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));
    expect(screen.getByText('صفحه ۲ از ۳')).toBeInTheDocument();
    screen.getAllByText('two')[0].closest('article')?.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('صفحه ۳ از ۳')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'پذیرش قرارداد' })).toBeEnabled();
    unmount();
    render(<ContractReview {...props} />);
    expect(await screen.findByText('صفحه ۳ از ۳')).toBeInTheDocument();
  });
});
