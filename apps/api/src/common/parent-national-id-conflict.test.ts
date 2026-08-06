import { describe, expect, it } from 'vitest';
import { ConflictError } from './errors';
import { withParentNationalIdConflict } from './parent-national-id-conflict';

const uniqueViolation = () => ({
  code: '23505',
  constraint: 'parents_national_id_unique',
});

describe('withParentNationalIdConflict', () => {
  it('turns a duplicate parent national ID constraint violation into an HTTP conflict', async () => {
    await expect(
      withParentNationalIdConflict(async () => {
        throw uniqueViolation();
      }),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_NATIONAL_ID',
      status: 409,
      message: 'A parent with this national ID already exists.',
    });
  });

  it('handles a concurrent loser after both requests pass an application-level check', async () => {
    let inserted = false;
    const insert = async () => {
      await Promise.resolve();
      if (inserted) throw uniqueViolation();
      inserted = true;
      return 'created';
    };

    const results = await Promise.allSettled([
      withParentNationalIdConflict(insert),
      withParentNationalIdConflict(insert),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(({ status }) => status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.objectContaining({ code: 'DUPLICATE_NATIONAL_ID', status: 409 }),
    });
  });

  it('recognizes driver errors wrapped in a cause and preserves unrelated failures', async () => {
    await expect(
      withParentNationalIdConflict(async () => {
        throw Object.assign(new Error('query failed'), { cause: uniqueViolation() });
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    const unrelated = Object.assign(new Error('connection failed'), { code: '08006' });
    await expect(
      withParentNationalIdConflict(async () => {
        throw unrelated;
      }),
    ).rejects.toBe(unrelated);
  });
});
