import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';

function service(current = { id: 1, defaultPrepaymentAmount: 49_978_000, paymentMode: 'ONLINE', version: 3 }) {
  const returning = vi.fn().mockResolvedValue([{ ...current, paymentMode: 'OFFLINE', version: 4 }]);
  const set = vi.fn(() => ({ where: () => ({ returning }) }));
  const txn = {
    select: () => ({ from: () => ({ where: () => ({ for: async () => [current] }) }) }),
    update: () => ({ set }),
  };
  const db = { db: { transaction: async (work: (tx: typeof txn) => Promise<unknown>) => work(txn) } };
  const audit = { recordInTransaction: vi.fn() };
  const payments = new PaymentsService(db as never, { enabled: true } as never, {} as never, audit as never);
  return { payments, set, audit };
}

describe('admin payment mode', () => {
  it('changes the mode with version checking and an audit record', async () => {
    const { payments, set, audit } = service();
    await expect(payments.configurePaymentMode('admin-1', 'OFFLINE', 3))
      .resolves.toMatchObject({ paymentMode: 'OFFLINE', version: 4 });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ paymentMode: 'OFFLINE', version: 4 }));
    expect(audit.recordInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'PAYMENT_MODE_CHANGED' }));
  });

  it('rejects stale changes', async () => {
    const { payments, set } = service();
    await expect(payments.configurePaymentMode('admin-1', 'OFFLINE', 2))
      .rejects.toMatchObject({ code: 'STALE_PAYMENT_SETTINGS' });
    expect(set).not.toHaveBeenCalled();
  });

  it('does not enable online mode without a gateway', async () => {
    const unavailable = new PaymentsService({} as never, { enabled: false } as never, {} as never);
    await expect(unavailable.configurePaymentMode('admin-1', 'ONLINE', 3))
      .rejects.toMatchObject({ code: 'PAYMENT_GATEWAY_UNAVAILABLE' });
  });
});
