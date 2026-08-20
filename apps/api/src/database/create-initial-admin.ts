import * as argon2 from 'argon2';
import { Pool, type PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export const INITIAL_ADMIN = {
  username: 'demo-admin', firstName: 'مدیر', lastName: 'سامانه',
  phoneNumber: '09120000000', password: 'demo-admin-password',
} as const;

export async function createInitialAdmin(
  client: Pick<PoolClient, 'query'>,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (environment.ALLOW_INSECURE_DEMO_ADMIN !== 'true') {
    throw new Error('Refusing known demo credentials. Set ALLOW_INSECURE_DEMO_ADMIN=true for this one-time operation.');
  }
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('create-initial-admin'))");
    const existing = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM admin_users');
    if (Number(existing.rows[0]?.count ?? 0) !== 0) throw new Error('Initial administrator was not created because an administrator already exists.');
    const passwordHash = await argon2.hash(INITIAL_ADMIN.password);
    await client.query(
      `INSERT INTO admin_users (id, username, first_name, last_name, phone_number, status, password_hash)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)`,
      [uuidv4(), INITIAL_ADMIN.username, INITIAL_ADMIN.firstName, INITIAL_ADMIN.lastName, INITIAL_ADMIN.phoneNumber, passwordHash],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
  return { username: INITIAL_ADMIN.username, phoneNumber: INITIAL_ADMIN.phoneNumber };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const admin = await createInitialAdmin(client);
      console.log(`Initial administrator created: ${admin.username} (${admin.phoneNumber}).`);
      console.warn('Change the known demo password immediately after the first successful login.');
    } finally { client.release(); }
  } finally { await pool.end(); }
}

if (require.main === module) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
