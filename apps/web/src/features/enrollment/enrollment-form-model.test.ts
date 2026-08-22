import { describe, expect, it } from 'vitest';
import { applyGuardianRelationship, createEnrollmentFormState } from './enrollment-form-model';

describe('enrollment form model', () => {
  it('derives school level and grade from an existing student', () => {
    const result = createEnrollmentFormState({
      schools: [
        {
          id: 'school-1',
          name: 'School',
          city: 'Tehran',
          educationOptions: [{ level: 'Primary', grades: ['First', 'Second'] }],
        },
      ],
      savedParents: { father: null, mother: null },
      existingStudents: [
        {
          id: 'student-1',
          schoolId: 'school-1',
          firstName: 'Ali',
          lastName: 'Ahmadi',
          nationalId: '0013540399',
          birthDate: null,
          gender: null,
          grade: 'Second',
          className: null,
        },
      ],
      defaults: {},
    });

    expect(result).toMatchObject({
      existingStudentId: 'student-1',
      educationLevel: 'Primary',
      grade: 'Second',
    });
  });

  it('returns independent form objects', () => {
    const input = {
      schools: [],
      savedParents: { father: null, mother: null },
      existingStudents: [],
      defaults: {},
    };

    const first = createEnrollmentFormState(input);
    const second = createEnrollmentFormState(input);
    first.city = 'Changed';

    expect(second.city).toBe('تهران');
  });

  it('clears guardian identity when the relationship changes', () => {
    const initial = createEnrollmentFormState({
      schools: [],
      savedParents: { father: null, mother: null },
      existingStudents: [],
      defaults: {},
      guardianPhone: '09126546078',
    });
    initial.guardianFirst = 'مریم';
    initial.guardianLast = 'احمدی';
    initial.guardianNationalId = '0013540394';
    initial.guardianRelationshipType = 'FATHER';

    const other = applyGuardianRelationship(initial, 'OTHER');
    const mother = applyGuardianRelationship(other, 'MOTHER');

    expect(mother).toMatchObject({
      guardianFirst: '',
      guardianLast: '',
      guardianNationalId: '',
      guardianPhone: '',
      guardianRelationshipType: 'MOTHER',
    });
  });

  it('does not erase guardian identity when the same relationship is selected again', () => {
    const initial = createEnrollmentFormState({
      schools: [],
      savedParents: { father: null, mother: null },
      existingStudents: [],
      defaults: {},
      guardianPhone: '09126546078',
    });
    initial.guardianFirst = 'حسین';
    initial.guardianNationalId = '0499370899';
    initial.guardianRelationshipType = 'FATHER';

    expect(applyGuardianRelationship(initial, 'FATHER')).toBe(initial);
  });
});
