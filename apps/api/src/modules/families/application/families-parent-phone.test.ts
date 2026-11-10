import { describe, expect, it } from 'vitest';
import { onboardingSessions, parents, students, users } from '../../../database/schemas';
import { FamiliesService } from './families.service';

describe('admin parent phone correction', () => {
  it('reclaims the old number from an expired draft for the same parent', async () => {
    const parent = { id: 'parent-1', userId: 'family-1', nationalId: '0050049402', phoneNumber: '09121903207', isPrimaryContact: true, phoneVerifiedAt: null, firstName: 'A', lastName: 'B' };
    const draft = { id: 'draft-1', accountStatus: 'PENDING', username: '09121983207:0050049402' };
    const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    let userSelect = 0;
    let parentSelect = 0;
    const select = () => ({ from: (table: unknown) => ({ where: () => {
      const rows = table === parents ? (++parentSelect === 1 ? [parent] : [])
        : table === users ? (++userSelect === 1 ? [draft] : [{ username: '09121903207', phoneNumber: '09121903207' }])
        : table === students ? []
        : table === onboardingSessions ? [{ status: 'EXPIRED', expiresAt: new Date(0) }] : [];
      const terminal = { limit: async () => rows, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) };
      return { ...terminal, for: () => terminal };
    } }) });
    const txn = { select, update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) }) };
    const database = { db: { select, transaction: (work: (value: typeof txn) => Promise<unknown>) => work(txn) } };
    const service = new FamiliesService(database as never, {} as never);
    await expect(service.adminUpdateParent('family-1', 'parent-1', { phoneNumber: '09121983207' })).resolves.toEqual({ updated: true });
    expect(updates).toContainEqual(expect.objectContaining({ table: users, values: expect.objectContaining({ phoneNumber: null }) }));
    expect(updates).toContainEqual(expect.objectContaining({ table: parents, values: expect.objectContaining({ phoneNumber: '09121983207' }) }));
  });
});
