import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../common/errors';
import {
  assertStudentPhotoTransition,
  STUDENT_PHOTO_STATUSES,
  type StudentPhotoStatus,
} from './student-photo-lifecycle';

const allowedTransitions = [
  ['AUTHORIZED', 'UPLOADED'],
  ['AUTHORIZED', 'EXPIRED'],
  ['AUTHORIZED', 'FAILED'],
  ['UPLOADED', 'VALIDATING'],
  ['UPLOADED', 'FAILED'],
  ['UPLOADED', 'EXPIRED'],
  ['VALIDATING', 'PENDING_REVIEW'],
  ['VALIDATING', 'FAILED'],
  ['PENDING_REVIEW', 'APPROVED'],
  ['PENDING_REVIEW', 'REJECTED'],
  ['APPROVED', 'SUPERSEDED'],
] as const;

describe('student photo lifecycle', () => {
  it.each(allowedTransitions)('allows %s -> %s', (current, next) => {
    expect(() => assertStudentPhotoTransition(current, next)).not.toThrow();
  });

  it('rejects every transition not explicitly allowed', () => {
    const allowed = new Set(allowedTransitions.map(([current, next]) => `${current}:${next}`));

    for (const current of STUDENT_PHOTO_STATUSES) {
      for (const next of STUDENT_PHOTO_STATUSES) {
        if (current === next) continue;
        if (allowed.has(`${current}:${next}`)) continue;
        expect(() => assertStudentPhotoTransition(current, next)).toThrow(ValidationError);
      }
    }
  });

  it('is idempotent when the current and next status are equal', () => {
    expect(() => assertStudentPhotoTransition('APPROVED', 'APPROVED')).not.toThrow();
  });

  it('rejects moving out of a terminal status', () => {
    expect(() => assertStudentPhotoTransition('APPROVED', 'REJECTED')).toThrow(ValidationError);
    expect(() => assertStudentPhotoTransition('REJECTED', 'UPLOADED')).toThrow(ValidationError);
    expect(() => assertStudentPhotoTransition('FAILED', 'UPLOADED')).toThrow(ValidationError);
    expect(() => assertStudentPhotoTransition('EXPIRED', 'AUTHORIZED')).toThrow(ValidationError);
    expect(() => assertStudentPhotoTransition('SUPERSEDED', 'APPROVED')).toThrow(ValidationError);
  });

  it('rejects unknown persisted statuses', () => {
    expect(() =>
      assertStudentPhotoTransition('UNKNOWN' as StudentPhotoStatus, 'UPLOADED'),
    ).toThrow(ValidationError);
  });
});
