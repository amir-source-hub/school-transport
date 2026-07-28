import { describe, expect, it } from 'vitest';
import { createEnrollmentFormState } from './enrollment-form-model';

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
});
