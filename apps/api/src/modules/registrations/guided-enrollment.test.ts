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
      nationalId: '۰۰۱۳۵۴۰۳۹۹',
    },
    father: {
      firstName: 'Reza',
      lastName: 'Ahmadi',
      nationalId: '0499370899',
      phoneNumber: '09121111111',
    },
    mother: {
      firstName: 'Sara',
      lastName: 'Ahmadi',
      nationalId: '0067749829',
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

    expect(result.student.nationalId).toBe('0013540399');
    expect(input.student.nationalId).toBe('۰۰۱۳۵۴۰۳۹۹');
  });

  it('rejects unsupported service types', () => {
    const input = validEnrollment();
    input.service.serviceType = 'MOTORCYCLE';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'The selected vehicle type is not supported.',
    );
  });

  it('rejects incomplete admin or parent submissions through the shared policy', () => {
    const input = validEnrollment();
    input.emergencyContact.phoneNumber = '';

    expect(() => normalizeAndValidateGuidedEnrollment(input)).toThrow(
      'All required enrollment fields must be completed.',
    );
  });

  it('keeps contract generation independent from persistence', () => {
    expect(guidedContractText('Ali', 'Ahmadi')).toContain('Ali Ahmadi');
  });
});
