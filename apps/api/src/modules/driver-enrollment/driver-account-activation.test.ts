import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('driver enrollment account activation', () => {
  it('activates the pending driver account inside the enrollment transaction', () => {
    const source = readFileSync(resolve(__dirname, 'driver-enrollment.service.ts'), 'utf8');
    const start = source.indexOf('async enroll(');
    const transaction = source.slice(start, source.indexOf('async replacePhoto(', start));

    expect(transaction).toContain('.update(users)');
    expect(transaction).toContain("eq(users.accountStatus, 'PENDING')");
    expect(transaction).toContain("accountStatus: 'ACTIVE'");
    expect(transaction).toContain('username: verifiedPhone');
    expect(transaction.indexOf('.update(users)')).toBeLessThan(
      transaction.indexOf('DRIVER_ENROLLMENT_COMPLETED'),
    );
  });

  it('ships a repair migration limited to complete active driver records', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../drizzle/0063_activate_enrolled_driver_accounts.sql'),
      'utf8',
    );

    expect(migration).toContain(`u."account_type" = 'DRIVER'`);
    expect(migration).toContain('INNER JOIN "vehicles"');
    expect(migration).toContain(`d."status" = 'ACTIVE'`);
  });
});
