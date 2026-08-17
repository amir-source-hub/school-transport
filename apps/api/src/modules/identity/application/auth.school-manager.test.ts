import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authSessions, schoolManagerUsers } from '../../../database/schemas';

const baseConfig = {
  jwtSecret: 'secret',
  jwtAccessTokenTtl: 3600,
  jwtRefreshTokenTtl: 86400,
  jwtRememberRefreshTokenTtl: 604800,
  adminJwtAccessTokenTtl: 3600,
  adminJwtRefreshTokenTtl: 86400,
  adminJwtRememberRefreshTokenTtl: 604800,
  managerMaxFailedLoginAttempts: 5,
  managerLockoutSeconds: 1800,
};

const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

async function hash(plain: string) {
  const argon2 = await import('argon2');
  return argon2.hash(plain);
}

/** Lightweight query-chain double supporting the manager auth operations. */
function chainRows(rows: () => unknown[], preRows?: () => void) {
  const chain = (current: () => unknown[]) => ({
    then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve(current()).then(resolve, reject),
    where: () => {
      preRows?.();
      return chain(current);
    },
    orderBy: () => chain(current),
    limit: (n: number) => chain(() => current().slice(0, n)),
  });
  return chain(rows);
}

function buildDb(overrides: { managerRecord?: Record<string, unknown> | null } = {}) {
  const holder = { records: overrides.managerRecord ? [overrides.managerRecord] : [] as Record<string, unknown>[] };
  const sessionInserts: Array<Record<string, unknown>> = [];
  const updatesByTable = new Map<unknown, Array<Record<string, unknown>>>();

  const recordFor = (table: unknown): unknown[] => (table === schoolManagerUsers ? holder.records : []);

  const db = {
    db: {
      select: () => ({
        from: (table: unknown) => chainRows(() => recordFor(table)),
      }),
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          sessionInserts.push(value);
        },
      }),
      update: (table: unknown) => ({
        set: (changes: Record<string, unknown>) => ({
          where: () => {
            if (!updatesByTable.has(table)) updatesByTable.set(table, []);
            updatesByTable.get(table)!.push(changes);
            if (table === schoolManagerUsers && holder.records.length) {
              holder.records[0] = { ...holder.records[0], ...changes };
            }
            return { returning: async () => [{ id: 'manager-1' }] };
          },
        }),
      }),
      transaction: async (work: (txn: any) => Promise<unknown>) => {
        const txn = {
          insert: () => ({
            values: async (value: Record<string, unknown>) => sessionInserts.push(value),
          }),
          update: () => ({
            set: () => ({
              where: () => ({ returning: async () => [] }),
            }),
          }),
        };
        await work(txn);
      },
    },
  };
  return { db, holder, sessionInserts, updatesByTable };
}

function serviceFor(db: unknown, config: unknown = baseConfig, audit?: unknown) {
  return new AuthService(
    { signAsync: vi.fn().mockResolvedValue('signed-token') } as never,
    config as never,
    db as never,
    logger as never,
    {} as never,
    {} as never,
    (audit ?? { record: vi.fn().mockResolvedValue(undefined), recordInTransaction: vi.fn() }) as never,
  );
}

describe('school manager login', () => {
  it('mints a SCHOOL_MANAGER session and reports the temporary credential flag', async () => {
    const { db, sessionInserts } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('demo-password'),
        status: 'ACTIVE',
        mustChangeCredentials: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    const service = serviceFor(db);

    const result = await service.loginSchoolManager('09120000000', 'demo-password');

    expect(result.user).toEqual(
      expect.objectContaining({ id: 'manager-1', role: 'SCHOOL_MANAGER', mustChangeCredentials: true }),
    );
    expect(sessionInserts[0]).toMatchObject({ subjectId: 'manager-1', role: 'SCHOOL_MANAGER' });
  });

  it('never discloses which part of the credentials failed', async () => {
    const { db } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('right-password'),
        status: 'ACTIVE',
        mustChangeCredentials: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    const service = serviceFor(db);

    await expect(
      service.loginSchoolManager('09120000000', 'wrong-password'),
    ).rejects.toThrow('نام کاربری یا رمز عبور صحیح نیست.');
    await expect(service.loginSchoolManager('no-such-user', 'anything')).rejects.toThrow(
      'نام کاربری یا رمز عبور صحیح نیست.',
    );
  });

  it('locks the account after repeated failures', async () => {
    const { db, holder } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('right-password'),
        status: 'ACTIVE',
        mustChangeCredentials: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    const service = serviceFor(db);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.loginSchoolManager('09120000000', 'wrong-password'),
      ).rejects.toThrow('نام کاربری یا رمز عبور صحیح نیست.');
    }

    expect(holder.records[0].lockedUntil).toBeTruthy();
    expect(holder.records[0].failedLoginCount).toBe(0);
    await expect(service.loginSchoolManager('09120000000', 'right-password')).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
  });
});

describe('school manager provisioning', () => {
  it('provisions hashed temporary credentials and an active primary assignment', async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined), recordInTransaction: vi.fn() };
    const transactedInserts: Array<Record<string, unknown>> = [];
    const db = {
      db: {
        select: () => ({
          from: (table: unknown) =>
            table === schoolManagerUsers
              ? chainRows(() => [])
              : chainRows(() => [{ id: 'school-1' }]),
        }),
        transaction: async (work: (txn: any) => Promise<unknown>) => {
          const txn = {
            insert: () => ({
              values: async (value: Record<string, unknown>) => transactedInserts.push(value),
            }),
          };
          await work(txn);
        },
      },
    };
    const service = serviceFor(db, baseConfig, audit);

    const result = await service.provisionSchoolManager(
      {
        username: '09120000000',
        firstName: 'مدیر',
        lastName: 'مدرسه',
      phoneNumber: '09120000000',
      schoolId: 'school-1',
      password: 'temporary-password',
      },
      { id: 'admin-1', ip: '127.0.0.1' },
    );

    expect(result.id).toBeTruthy();
    const managerRow = transactedInserts.find((row) => (row as any).status === 'ACTIVE');
    expect(managerRow).toBeTruthy();
    expect((managerRow as any).mustChangeCredentials).toBe(true);
    expect((managerRow as any).passwordHash).not.toBe('09120000000');
    expect((managerRow as any).passwordHash).toMatch(/^\$argon2/);
    const assignmentRow = transactedInserts.find((row) => (row as any).schoolId === 'school-1');
    expect(assignmentRow).toBeTruthy();
    expect((assignmentRow as any).isPrimary).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHOOL_MANAGER_PROVISIONED' }),
    );
  });
});

describe('school manager credential change', () => {
  it('rejects a new username or password equal to the phone number', async () => {
    const { db } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('temporary-password'),
        status: 'ACTIVE',
      },
    });
    const service = serviceFor(db);

    await expect(
      service.changeSchoolManagerCredentials(
        'manager-1',
        { currentPassword: 'temporary-password', newUsername: '09120000000', newPassword: 'new-password' },
        { id: 'manager-1' },
      ),
    ).rejects.toThrow('نام کاربری نباید با شماره همراه مدیر یکسان باشد.');

    await expect(
      service.changeSchoolManagerCredentials(
        'manager-1',
        { currentPassword: 'temporary-password', newUsername: 'manager-name', newPassword: '09120000000' },
        { id: 'manager-1' },
      ),
    ).rejects.toThrow('رمز عبور نباید با شماره همراه مدیر یکسان باشد.');
  });

  it('requires the current password', async () => {
    const { db } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('temporary-password'),
        status: 'ACTIVE',
      },
    });
    const service = serviceFor(db);
    await expect(
      service.changeSchoolManagerCredentials(
        'manager-1',
        { currentPassword: 'wrong', newUsername: 'new-name', newPassword: 'new-password' },
        { id: 'manager-1' },
      ),
    ).rejects.toThrow('رمز عبور فعلی صحیح نیست.');
  });

  it('revokes all sessions and clears the forced flag on success', async () => {
    const { db, updatesByTable } = buildDb({
      managerRecord: {
        id: 'manager-1',
        username: '09120000000',
        phoneNumber: '09120000000',
        passwordHash: await hash('temporary-password'),
        status: 'ACTIVE',
        mustChangeCredentials: true,
      },
    });
    const service = serviceFor(db);

    await service.changeSchoolManagerCredentials(
      'manager-1',
      { currentPassword: 'temporary-password', newUsername: 'new-manager', newPassword: 'new-password' },
      { id: 'manager-1', ip: '127.0.0.1' },
    );

    const managerUpdates = updatesByTable.get(schoolManagerUsers) ?? [];
    const sessionUpdates = updatesByTable.get(authSessions) ?? [];
    expect(managerUpdates.some((row) => row.mustChangeCredentials === false)).toBe(true);
    expect(managerUpdates.some((row) => row.username === 'new-manager')).toBe(true);
    expect(sessionUpdates.some((row) => row.revocationReason === 'CREDENTIALS_CHANGED')).toBe(true);
  });
});
