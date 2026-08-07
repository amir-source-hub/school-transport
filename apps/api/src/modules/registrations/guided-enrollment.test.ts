import { describe, expect, it } from 'vitest';
import {
  guidedContractText,
  normalizeAndValidateGuidedEnrollment,
  type GuidedEnrollmentData,
} from './guided-enrollment';

function validEnrollment(): GuidedEnrollmentData {
  return {
    student: {
      firstName: 'Ali',
      lastName: 'Ahmadi',
      nationalId: '۰۰۱۳۵۴۰۳۹۴',
    },
    guardian: {
      firstName: 'Reza',
      lastName: 'Ahmadi',
      nationalId: '0499370899',
      relationshipType: 'FATHER',
    },
    homePhone: '02122113333',
    father: {
      firstName: 'Reza',
      lastName: 'Ahmadi',
      nationalId: '0499370899',
      phoneNumber: '09121111111',
    },
    mother: {
      firstName: 'Sara',
      lastName: 'Ahmadi',
      nationalId: '0067749811',
      phoneNumber: '09122222222',
    },
    emergencyContact: {
      firstName: 'Maryam',
      lastName: 'Ahmadi',
      relationship: 'Aunt',
      phoneNumber: '09123333333',
    },
    address: {
      title: 'Home',
      province: 'Tehran',
      city: 'Tehran',
      streetAddress: 'Example street',
      postalCode: '1234567890',
      latitude: 35.7,
      longitude: 51.3,
    },
    school: {
      schoolId: 'school-id',
      educationLevel: 'Primary',
      grade: 'First',
    },
    service: {
      serviceType: 'BUS',
      paymentPlanType: 'INSTALLMENTS',
    },
  };
}

describe('guided enrollment policy', () => {
  it('normalizes national IDs without mutating the request', () => {
    const input = validEnrollment();

    const result = normalizeAndValidateGuidedEnrollment(input);

    expect(result.student.nationalId).toBe('0013540394');
    expect(result.guardian.nationalId).toBe('0499370899');
    expect(input.student.nationalId).toBe('۰۰۱۳۵۴۰۳۹۴');
  });

  it('rejects unsupported service types', () => {
    const input = validEnrollment();
    input.service.serviceType = 'MOTORCYCLE';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'The selected vehicle type is not supported.',
    );
  });

  it('rejects incomplete required guardian fields', () => {
    const input = validEnrollment();
    input.guardian.firstName = '';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'All required enrollment fields must be completed.',
    );
  });

  it('requires a relationship description when the guardian is "other"', () => {
    const input = validEnrollment();
    input.guardian.relationshipType = 'OTHER';
    input.guardian.relationshipDescription = '';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'A relationship description is required when the guardian relationship is other.',
    );
  });

  it('rejects partially completed optional parent sections', () => {
    const input = validEnrollment();
    input.father = { ...input.father!, phoneNumber: '' };

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'Partially completed parent information must include all fields.',
    );
  });

  it('accepts an enrollment with no optional contacts', () => {
    const input = validEnrollment();
    input.father = null;
    input.mother = null;
    input.emergencyContact = null;

    expect(() => normalizeAndValidateGuidedEnrollment(input)).not.toThrow();
  });

  it('requires a 021 Tehran home phone', () => {
    const input = validEnrollment();
    input.homePhone = '0';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow('A 021 Tehran landline number is required.');
  });

  it('normalizes and validates the optional student mobile number', () => {
    const input = validEnrollment();
    input.student.phoneNumber = '۰۹۱۲۳۴۵۶۷۸۹';

    const result = normalizeAndValidateGuidedEnrollment(input);

    expect(result.student.phoneNumber).toBe('09123456789');
  });

  it('rejects an invalid optional student mobile number', () => {
    const input = validEnrollment();
    input.student.phoneNumber = '091234';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'A valid Iranian mobile number is required for the student.',
    );
  });

  it('keeps contract generation independent from persistence', () => {
    expect(guidedContractText('Ali', 'Ahmadi')).toContain('Ali Ahmadi');
  });
});
