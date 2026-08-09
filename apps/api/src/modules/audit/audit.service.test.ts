import { describe, expect, it } from 'vitest';
import { allowlistedAuditValues } from './audit.service';
import { serializeSafeAuditValues } from '../../common/sensitive-data';

describe('audit value allowlist', () => {
  it('keeps operational student fields and drops direct child identifiers', () => {
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
      grade: 'سوم',
      schoolId: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('never admits direct identifiers into before/after values', () => {
    const serialized = serializeSafeAuditValues(
      allowlistedAuditValues({
        firstName: 'علی',
        nationalId: '0499370899',
        grade: 'سوم',
      }),
    );
    expect(serialized).toBe('{"grade":"سوم"}');
  });

  it('returns undefined for non-object values', () => {
    expect(allowlistedAuditValues('string')).toBeUndefined();
    expect(allowlistedAuditValues([{ firstName: 'علی' }])).toBeUndefined();
  });
});
