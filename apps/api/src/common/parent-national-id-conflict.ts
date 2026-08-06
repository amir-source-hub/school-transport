import { ConflictError } from './errors';

const PARENT_NATIONAL_ID_CONSTRAINTS = new Set([
  'parents_national_id_unique',
  'idx_parents_national_id_unique',
]);

type DatabaseError = {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
};

function isParentNationalIdUniqueViolation(error: unknown): boolean {
  let current = error;
  const visited = new Set<unknown>();

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const databaseError = current as DatabaseError;
    if (
      databaseError.code === '23505' &&
      typeof databaseError.constraint === 'string' &&
      PARENT_NATIONAL_ID_CONSTRAINTS.has(databaseError.constraint)
    ) {
      return true;
    }
    current = databaseError.cause;
  }

  return false;
}

export async function withParentNationalIdConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isParentNationalIdUniqueViolation(error)) {
      throw new ConflictError(
        'DUPLICATE_NATIONAL_ID',
        'A parent with this national ID already exists.',
      );
    }
    throw error;
  }
}
