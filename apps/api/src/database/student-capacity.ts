import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schemas';
import { ConflictError } from '../common/errors';
import type { DatabaseTransaction } from './payment-plan';

export class StudentCapacityLimitError extends ConflictError {
  constructor() {
    super(
      'STUDENT_LIMIT_REACHED',
      'The account has reached its active student capacity.',
    );
  }
}

/**
 * Serializes count-and-insert for a guardian account and verifies the active
 * student profile count stays below the account's explicit studentLimit.
 *
 * Capacity is consumed only by active student profiles (isActive = true);
 * archived students free capacity. Registration statuses (draft, rejected,
 * cancelled, etc.) belong to enrollments and do not affect profile capacity.
 *
 * The owner row is locked FOR UPDATE so concurrent admin/parent student
 * creations for the same account cannot both pass the check and over-insert.
 */
export async function assertStudentCapacity(
  txn: DatabaseTransaction,
  userId: string,
): Promise<void> {
  const [account] = await txn
    .select({ studentLimit: schema.users.studentLimit })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .for('update');
  if (!account) {
    throw new ConflictError('ACCOUNT_PHONE_REQUIRED', 'Account not found.');
  }
  const [row] = await txn
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.userId, userId),
        eq(schema.students.isActive, true),
      ),
    );
  const activeCount = row?.count ?? 0;
  if (activeCount >= account.studentLimit) {
    throw new StudentCapacityLimitError();
  }
}

export async function getStudentCapacity(
  db: NodePgDatabase<typeof schema>,
  userId: string,
): Promise<{ studentLimit: number; activeStudentCount: number; remaining: number }> {
  const [account] = await db
    .select({ studentLimit: schema.users.studentLimit })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const limit = account?.studentLimit ?? 2;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.userId, userId),
        eq(schema.students.isActive, true),
      ),
    );
  const activeStudentCount = row?.count ?? 0;
  return {
    studentLimit: limit,
    activeStudentCount,
    remaining: Math.max(0, limit - activeStudentCount),
  };
}
