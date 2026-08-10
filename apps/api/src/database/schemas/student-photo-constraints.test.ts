import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { studentPhotoUploads } from './student-photos.schema';

describe('student photo database invariants', () => {
  it('constrains lifecycle states, canonical review shape, and one approved photo', () => {
    const config = getTableConfig(studentPhotoUploads);
    expect(config.checks.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        'student_photos_valid_status',
        'student_photos_positive_version',
        'student_photos_positive_declared_size',
        'student_photos_canonical_for_review',
      ]),
    );
    expect(config.indexes.map((item) => item.config.name)).toContain(
      'idx_student_photos_one_approved',
    );
  });
});
