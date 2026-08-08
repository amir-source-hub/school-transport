import { describe, expect, it } from 'vitest';
import { allowlistedAuditValues } from './audit.service';
import { serializeSafeAuditValues } from '../../common/sensitive-data';

describe('audit value allowlist', () => {
  it('keeps student fields and drops unrelated keys', () => {
    expect(
      allowlistedAuditValues({
        firstName: 'علی',
        lastName: 'احمدی',
        nationalId: '0499370899',
        grade: 'سوم',
        className: 'دبستان',
        gender: 'MALE',
        birthDate: '2012-04-03',
        schoolId: '00000000-0000-4000-8000-000000000001',
        parentNotes: 'should be dropped',
        userId: 'should be dropped',
      }),
    ).toEqual({
      firstName: 'علی',
      lastName: 'احمدی',
      nationalId: '0499370899',
      grade: 'سوم',
      className: 'دبستان',
      gender: 'MALE',
      birthDate: '2012-04-03',
      schoolId: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('serializes before/after values with the national id masked', () => {
    const serialized = serializeSafeAuditValues(
      allowlistedAuditValues({
        firstName: 'علی',
        nationalId: '0499370899',
        grade: 'سوم',
      }),
    );
    expect(serialized).toBe('{"firstName":"علی","nationalId":"[REDACTED]","grade":"سوم"}');
  });

  it('returns undefined for non-object values', () => {
    expect(allowlistedAuditValues('string')).toBeUndefined();
    expect(allowlistedAuditValues([{ firstName: 'علی' }])).toBeUndefined();
  });
});
