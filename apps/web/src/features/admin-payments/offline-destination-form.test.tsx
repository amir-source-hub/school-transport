import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfflineDestinationForm } from './offline-destination-form';

const api = vi.hoisted(() => ({ configureOfflineDestination: vi.fn() }));
vi.mock('./admin-payments-api', async (importOriginal) => ({ ...(await importOriginal()), ...api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('OfflineDestinationForm', () => {
  it('requires explicit confirmation and submits an optimistic version', async () => {
    const user = userEvent.setup();
    render(<OfflineDestinationForm current={{ id: 'd1', version: 3, accountOwner: 'شرکت', bankName: 'بانک', cardNumber: '6037991234567890', iban: null, accountNumber: null, instructions: 'راهنما', updatedAt: new Date() }} />);
    const save = screen.getByRole('button', { name: 'ذخیره نسخه جدید مقصد پرداخت' });
    expect(save).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(save);
    expect(api.configureOfflineDestination).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 3, confirmed: true, cardNumber: '6037991234567890' }));
  });
});
