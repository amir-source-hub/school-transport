import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContractReview } from './contract-review';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('./contracts-api', () => ({ acceptContract: vi.fn(), rejectContract: vi.fn() }));

describe('ContractReview', () => {
  it('shows all pages in one scrollable document and enables acceptance at the end', async () => {
    const props = {
      contractId: 'contract-1',
      version: 1,
      templateHash: 'hash-1',
      pages: [['one'], ['two'], ['three']],
      canAct: true,
    };
    render(<ContractReview {...props} />);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'پذیرش قرارداد' })).toBeDisabled();
    const article = screen.getByRole('article', { name: 'متن قرارداد' });
    Object.defineProperties(article, { scrollHeight: { value: 1000 }, clientHeight: { value: 200 }, scrollTop: { value: 800, writable: true } });
    fireEvent.scroll(article);
    expect(screen.getByRole('button', { name: 'پذیرش قرارداد' })).toBeEnabled();
  });
});
