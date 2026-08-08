import { describe, expect, it } from 'vitest';
import { parseAdminEditableStudentFields } from './student-admin-update';

describe('parseAdminEditableStudentFields', () => {
  it('accepts the documented editable identity and school fields', () => {
    const result = parseAdminEditableStudentFields({
      firstName: 'علی',
      lastName: 'احمدی',
      nationalId: '0499370899',
      birthDate: '2012-04-03',
      gender: 'MALE',
      schoolId: '00000000-0000-4000-8000-000000000001',
      className: 'دبستان',
      grade: 'سوم',
    });
    expect(result).toEqual({
      firstName: 'علی',
      lastName: 'احمدی',
      nationalId: '0499370899',
      birthDate: '2012-04-03',
      gender: 'MALE',
      schoolId: '00000000-0000-4000-8000-000000000001',
      className: 'دبستان',
      grade: 'سوم',
    });
  });

  it('rejects fields that are not editable through this endpoint', () => {
    expect(() => parseAdminEditableStudentFields({ userId: 'account-1' })).toThrow(
      "Field 'userId' cannot be changed through this endpoint.",
    );
    expect(() => parseAdminEditableStudentFields({ isActive: true })).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => parseAdminEditableStudentFields({ grade: 5 })).toThrow(
      "Field 'grade' must be a string.",
    );
  });

  it('requires at least one editable field', () => {
    expect(() => parseAdminEditableStudentFields({})).toThrow(
      'At least one editable student field is required.',
    );
  });
});
