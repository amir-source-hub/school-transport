import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../common/errors';
import { parseEditableStudentFields } from './student-update';

describe('student update field policy', () => {
  it('keeps only explicitly documented editable profile fields', () => {
    expect(
      parseEditableStudentFields({
        firstName: 'Sara',
        grade: '6',
        fatherName: 'رضا',
        birthDate: '2012-04-03',
        gender: 'FEMALE',
        phoneNumber: '09123456789',
        fieldOfStudy: 'ریاضی',
      }),
    ).toEqual({
      firstName: 'Sara',
      grade: '6',
      fatherName: 'رضا',
      birthDate: '2012-04-03',
      gender: 'FEMALE',
      phoneNumber: '09123456789',
      fieldOfStudy: 'ریاضی',
    });
  });

  it.each(['schoolId', 'nationalId', 'userId', 'isActive', 'registrationStatus'])(
    'rejects protected or ownership field %s',
    (field) => {
      expect(() => parseEditableStudentFields({ [field]: 'attacker-value' })).toThrow(
        ValidationError,
      );
    },
  );

  it('rejects invalid field types and empty updates', () => {
    expect(() => parseEditableStudentFields({ grade: 6 })).toThrow(ValidationError);
    expect(() => parseEditableStudentFields({})).toThrow(ValidationError);
  });
});
