import { ValidationError } from '../../common/errors';

export const STUDENT_PHOTO_STATUSES = [
  'AUTHORIZED',
  'UPLOADED',
  'VALIDATING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'EXPIRED',
  'SUPERSEDED',
] as const;

export type StudentPhotoStatus = (typeof STUDENT_PHOTO_STATUSES)[number];

const transitions: Record<StudentPhotoStatus, readonly StudentPhotoStatus[]> = {
  AUTHORIZED: ['UPLOADED', 'EXPIRED', 'FAILED'],
  UPLOADED: ['VALIDATING', 'FAILED', 'EXPIRED'],
  VALIDATING: ['PENDING_REVIEW', 'FAILED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUPERSEDED'],
  REJECTED: [],
  FAILED: [],
  EXPIRED: [],
  SUPERSEDED: [],
};

export function assertStudentPhotoTransition(
  current: StudentPhotoStatus,
  next: StudentPhotoStatus,
): void {
  if (current === next) return;
  if (!transitions[current]?.includes(next)) {
    throw new ValidationError(`Student photo status transition ${current} → ${next} is not allowed.`);
  }
}
