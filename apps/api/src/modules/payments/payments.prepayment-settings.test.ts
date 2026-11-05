import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { contracts, offlinePaymentSubmissions, paymentPlans, paymentScheduleItems, paymentTransactions, registrationPrices, serviceRegistrations } from '../../database/schemas';

const snapshot = JSON.stringify({ enrollment: {
  student: { firstName: 'علی', lastName: 'احمدی', nationalId: '1234567890', id: 'student-1' },
  guardian: { firstName: 'رضا', lastName: 'احمدی', nationalId: '1234567890', relationshipType: 'FATHER', phoneNumber: '09121111111' },
  homePhone: '02111111111', father: null, mother: null, emergencyContact: null,
  address: { title: 'خانه', province: 'تهران', city: 'تهران', streetAddress: 'خیابان', postalCode: '1234567890', latitude: 35.7, longitude: 51.4 },
  school: { schoolId: 'school-1', name: 'مدرسه', educationLevel: 'ابتدایی', grade: 'اول' },
  service: { serviceType: 'BUS', paymentPlanType: 'INSTALLMENTS' },
} });

function harness(contractStatus = 'GENERATED', itemStatus = 'PENDING') {
  const plan = { id: 'plan-1', registrationPriceId: 'price-1', prepaymentAmount: 49_978_000, planStatus: 'PENDING' };
  const price = { id: 'price-1', registrationId: 'registration-1', versionNumber: 1, priceStatus: 'ACCEPTED', installmentCount: 4, fullPaymentAllowed: true, installmentPaymentAllowed: true };
  const contract = { id: 'contract-1', contractStatus, contractDataSnapshot: snapshot };
  const item = { id: 'item-1', itemType: 'PREPAYMENT', itemStatus };
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const rows = (table: unknown) => table === paymentPlans ? [plan] : table === registrationPrices ? [price]
    : table === serviceRegistrations ? [{ academicYear: '1405-1406' }]
    : table === contracts ? [contract] : table === paymentScheduleItems ? [item]
    : table === paymentTransactions || table === offlinePaymentSubmissions ? [] : [];
  const select = () => ({ from: (table: unknown) => ({ where: () => {
    const values = rows(table);
    const terminal = { limit: async () => values, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(values).then(resolve) };
    return { ...terminal, for: () => terminal };
  } }) });
  const txn = { select, update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) }),
    insert: (table: unknown) => ({ values: async (values: Record<string, unknown>) => { inserts.push({ table, values }); } }) };
  const db = { transaction: async (work: (value: typeof txn) => Promise<unknown>) => work(txn) };
  const service = new PaymentsService({ db } as never, {} as never, {} as never);
  return { service, updates, inserts };
}

describe('student prepayment override', () => {
  it('versions the accepted price and updates the unsigned contract and payment amount together', async () => {
    const { service, updates, inserts } = harness();
    await service.configureStudentPrepayment('admin-1', 'plan-1', 65_000_000);
    expect(inserts.find(({ table }) => table === registrationPrices)?.values).toMatchObject({ totalAmount: 65_000_000, prepaymentAmount: 65_000_000, versionNumber: 2 });
    expect(updates.find(({ table }) => table === paymentPlans)?.values).toMatchObject({ totalAmount: 65_000_000, prepaymentAmount: 65_000_000 });
    expect(updates.find(({ table }) => table === paymentScheduleItems)?.values).toMatchObject({ amount: 65_000_000 });
    expect(updates.find(({ table }) => table === contracts)?.values.contractDataSnapshot).toContain('شش میلیون و پانصد هزار');
  });

  it.each([['ACCEPTED', 'PENDING'], ['GENERATED', 'PAID']])('refuses a signed contract or paid prepayment', async (contractStatus, itemStatus) => {
    const { service, updates } = harness(contractStatus, itemStatus);
    await expect(service.configureStudentPrepayment('admin-1', 'plan-1', 65_000_000)).rejects.toMatchObject({ code: 'PREPAYMENT_LOCKED' });
    expect(updates).toHaveLength(0);
  });
});
