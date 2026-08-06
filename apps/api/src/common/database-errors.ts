import { AppError, ConflictError, ValidationError } from './errors';

export const DATABASE_ERROR_MARKER = Symbol('school-transport.database-error');

type ErrorLike = {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
  [DATABASE_ERROR_MARKER]?: true;
};

export function markDatabaseError<T extends object>(
  error: T,
): T & { [DATABASE_ERROR_MARKER]: true } {
  Object.defineProperty(error, DATABASE_ERROR_MARKER, { value: true });
  return error as T & { [DATABASE_ERROR_MARKER]: true };
}

export interface DatabaseErrorTranslation {
  error: AppError;
  diagnostics: {
    category: 'unique' | 'foreign_key' | 'check' | 'serialization' | 'timeout' | 'availability';
    databaseCode: string;
    retryable: boolean;
  };
}

const uniqueConstraints: Record<string, { code: string; message: string }> = {
  parents_national_id_unique: {
    code: 'DUPLICATE_NATIONAL_ID',
    message: 'A parent with this national ID already exists.',
  },
  students_national_id_unique: {
    code: 'DUPLICATE_NATIONAL_ID',
    message: 'This student is already registered.',
  },
  users_phone_number_unique: {
    code: 'DUPLICATE_PHONE_NUMBER',
    message: 'This phone number is already in use.',
  },
  idx_users_phone: {
    code: 'DUPLICATE_PHONE_NUMBER',
    message: 'This phone number is already in use.',
  },
  idx_parents_user_type: {
    code: 'PARENT_TYPE_EXISTS',
    message: 'This parent type already exists.',
  },
};

function findErrorLike(error: unknown): { error?: ErrorLike; databaseMarked: boolean } {
  let current = error;
  const visited = new Set<unknown>();
  let found: ErrorLike | undefined;
  let databaseMarked = false;
  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const candidate = current as ErrorLike;
    databaseMarked ||= candidate[DATABASE_ERROR_MARKER] === true;
    if (!found && typeof candidate.code === 'string') found = candidate;
    current = candidate.cause;
  }
  return { error: found, databaseMarked };
}

export function translateDatabaseError(error: unknown): DatabaseErrorTranslation | undefined {
  const { error: databaseError, databaseMarked } = findErrorLike(error);
  if (!databaseError || typeof databaseError.code !== 'string') return undefined;

  const databaseCode = databaseError.code;
  const result = (appError: AppError, category: DatabaseErrorTranslation['diagnostics']['category'], retryable = false) => ({
    error: appError,
    diagnostics: { category, databaseCode, retryable },
  });

  if (databaseCode === '23505') {
    const known =
      typeof databaseError.constraint === 'string'
        ? uniqueConstraints[databaseError.constraint]
        : undefined;
    return result(
      new ConflictError(
        known?.code ?? 'DATABASE_CONFLICT',
        known?.message ?? 'The requested record conflicts with existing data.',
      ),
      'unique',
    );
  }
  if (databaseCode === '23503') {
    return result(
      new ConflictError(
        'RELATED_RESOURCE_CONFLICT',
        'The operation conflicts with a related resource.',
      ),
      'foreign_key',
    );
  }
  if (databaseCode === '23514' || databaseCode === '23502') {
    return result(new ValidationError('The submitted data violates a data constraint.'), 'check');
  }
  if (databaseCode === '40001' || databaseCode === '40P01') {
    return result(
      new AppError(
        'DATABASE_RETRY_REQUIRED',
        'The operation could not be completed. Please retry.',
        503,
      ),
      'serialization',
      true,
    );
  }
  if (databaseCode === '57014' || (databaseMarked && databaseCode === 'ETIMEDOUT')) {
    return result(
      new AppError('DATABASE_TIMEOUT', 'The service timed out. Please retry.', 503),
      'timeout',
      true,
    );
  }
  if (
    databaseCode.startsWith('08') ||
    ['57P01', '57P02', '57P03'].includes(databaseCode) ||
    (databaseMarked && ['ECONNREFUSED', 'ECONNRESET'].includes(databaseCode))
  ) {
    return result(
      new AppError(
        'DATABASE_UNAVAILABLE',
        'The service is temporarily unavailable. Please retry.',
        503,
      ),
      'availability',
      true,
    );
  }
  return undefined;
}
