import { describe, expect, it, vi } from 'vitest';
import { createInitialAdmin, INITIAL_ADMIN } from './create-initial-admin';

describe('createInitialAdmin', () => {
  it('requires explicit approval for known demo credentials', async () => {
    const query = vi.fn();
    await expect(createInitialAdmin({ query } as never, {})).rejects.toThrow('ALLOW_INSECURE_DEMO_ADMIN=true');
    expect(query).not.toHaveBeenCalled();
  });
  it('creates exactly one initial admin transactionally', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => sql.startsWith('SELECT count') ? { rows: [{ count: '0' }] } : { rows: [] });
    await expect(createInitialAdmin({ query } as never, { ALLOW_INSECURE_DEMO_ADMIN: 'true' })).resolves.toEqual({ username: INITIAL_ADMIN.username, phoneNumber: INITIAL_ADMIN.phoneNumber });
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO admin_users'))).toBe(true);
  });
  it('refuses to overwrite an existing administrator', async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => sql.startsWith('SELECT count') ? { rows: [{ count: '1' }] } : { rows: [] });
    await expect(createInitialAdmin({ query } as never, { ALLOW_INSECURE_DEMO_ADMIN: 'true' })).rejects.toThrow('already exists');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
  });
});
