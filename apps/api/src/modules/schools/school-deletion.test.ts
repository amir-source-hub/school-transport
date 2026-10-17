import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import { schoolManagerAssignments, schools, students } from '../../database/schemas';
import { SchoolsService } from './schools.service';

const schoolId = '00000000-0000-0000-0000-000000000001';

function setup(studentExists: boolean) {
  const deletedTables: unknown[] = [];
  const select = vi.fn(() => ({
    from: (table: unknown) => ({
      where: () => ({ limit: async () => (table === students && studentExists ? [{ id: 'student' }] : []) }),
    }),
  }));
  const tx = {
    select,
    delete: vi.fn((table: unknown) => {
      deletedTables.push(table);
      return {
        where: () => ({ returning: async () => [{ id: schoolId }] }),
      };
    }),
  };
  const database = {
    db: { transaction: async (action: (transaction: typeof tx) => Promise<unknown>) => action(tx) },
  } as unknown as DatabaseService;
  const service = new SchoolsService(database);
  vi.spyOn(service, 'getById').mockResolvedValue({ id: schoolId } as never);
  return { service, deletedTables };
}

describe('permanent school deletion', () => {
  it('preserves a school with students and its manager assignment', async () => {
    const { service, deletedTables } = setup(true);
    await expect(service.permanentlyDelete(schoolId)).rejects.toMatchObject({
      code: 'SCHOOL_HAS_DEPENDENCIES',
      status: 409,
    });
    expect(deletedTables).toEqual([]);
  });

  it('removes an unused school and its assignment in one transaction', async () => {
    const { service, deletedTables } = setup(false);
    await expect(service.permanentlyDelete(schoolId)).resolves.toEqual({ deleted: true });
    expect(deletedTables).toEqual([schoolManagerAssignments, schools]);
  });
});
