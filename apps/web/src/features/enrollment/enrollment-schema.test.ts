import { describe, expect, it } from 'vitest';
import { guidedEnrollmentSchema } from './enrollment-schema';

const validInput = {
  student: {
    firstName: 'علی',
    lastName: 'احمدی',
    fatherName: 'حسین',
    nationalId: '0013542419',
    birthDate: '2012-05-14',
    gender: 'MALE',
  },
  guardian: {
    firstName: 'حسین',
    lastName: 'احمدی',
    nationalId: '0084575948',
    relationshipType: 'FATHER',
  },
  father: {
    firstName: 'حسین',
    lastName: 'احمدی',
    nationalId: '0084575948',
    phoneNumber: '09123456789',
  },
  mother: {
    firstName: 'مریم',
    lastName: 'رضایی',
    nationalId: '0013540394',
    phoneNumber: '09129998877',
  },
  emergencyContact: {
    firstName: 'زهرا',
    lastName: 'کریمی',
    relationship: 'خاله',
    phoneNumber: '09121112222',
  },
  homePhone: '02122113333',
  address: {
    title: 'منزل',
    province: 'تهران',
    city: 'تهران',
    streetAddress: 'خیابان آزادی، پلاک ۱',
    postalCode: '1111111221',
    latitude: 35.7,
    longitude: 51.3,
  },
  school: {
    schoolId: '8b841592-e504-4f0a-9e31-40a2aa540f3f',
    educationLevel: 'هفتم',
    grade: 'هفتم',
  },
  service: { serviceType: 'BUS', paymentPlanType: 'INSTALLMENTS', parentNotes: 'مسیر کوتاه' },
};

describe('guided enrollment schema', () => {
  it('accepts a complete and valid enrollment', () => {
    const result = guidedEnrollmentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.student.nationalId).toBe('0013542419');
  });

  it('accepts an enrollment with no optional contacts', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      father: null,
      mother: null,
      emergencyContact: null,
    });
    expect(result.success).toBe(true);
  });

  it('requires the student father name independently', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      student: { ...validInput.student, fatherName: '' },
    });
    expect(result.success).toBe(false);
  });

  it('requires a guardian relationship description when relationship is OTHER', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      guardian: { ...validInput.guardian, relationshipType: 'OTHER' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain('شرح نسبت را وارد کنید.');
    }
    const described = guidedEnrollmentSchema.safeParse({
      ...validInput,
      guardian: {
        ...validInput.guardian,
        relationshipType: 'OTHER',
        relationshipDescription: 'پدربزرگ',
      },
    });
    expect(described.success).toBe(true);
  });

  it('normalizes Persian digits and trims national IDs', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      student: { ...validInput.student, nationalId: '۰۰۱۳۵۴۲۴۱۹' },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.student.nationalId).toBe('0013542419');
  });

  it('rejects a short mobile number with the exact Persian message', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      father: { ...validInput.father, phoneNumber: '0912' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.message);
      expect(issues).toContain('شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
    }
  });

  it('warns about the Persian keyboard when a name uses Latin letters', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      student: { ...validInput.student, firstName: 'Ali' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'لطفاً صفحه‌کلید را به فارسی تغییر دهید',
      );
    }
  });

  it('rejects an over-length national ID with the exact Persian message', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      mother: { ...validInput.mother, nationalId: '001234567891' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.message);
      expect(issues).toContain('کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.');
    }
  });

  it('accepts national IDs with leading zeros and short values', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      student: { ...validInput.student, nationalId: '0023518805' },
      guardian: { ...validInput.guardian, nationalId: '123' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.student.nationalId).toBe('0023518805');
      expect(result.data.guardian.nationalId).toBe('123');
    }
  });
});

describe('mobile, landline, and postal code validation', () => {
  it('accepts and normalizes a Persian-digit mobile number', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      father: { ...validInput.father, phoneNumber: '۰۹۱۲۳۴۵۶۷۸۹' },
    });
    expect(result.success).toBe(true);
  });

  it.each(['0912345678', '091234567890', '02622113333'])(
    'rejects an invalid mobile number: %s',
    (phoneNumber) => {
      const result = guidedEnrollmentSchema.safeParse({
        ...validInput,
        father: { ...validInput.father, phoneNumber },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
        );
      }
    },
  );

  it('accepts a Persian-digit Tehran landline home phone', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      homePhone: '۰۲۱۲۲۱۱۳۳۳۳',
    });
    expect(result.success).toBe(true);
  });

  it.each(['02622113333', '0212211333', '021221133330'])(
    'rejects an invalid home phone: %s',
    (homePhone) => {
      const result = guidedEnrollmentSchema.safeParse({ ...validInput, homePhone });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          'شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.',
        );
      }
    },
  );

  it('accepts a Persian-digit ten-digit postal code', () => {
    const result = guidedEnrollmentSchema.safeParse({
      ...validInput,
      address: { ...validInput.address, postalCode: '۱۱۱۱۱۱۱۲۲۱' },
    });
    expect(result.success).toBe(true);
  });

  it.each(['111111122', '11111112211', '123456789a'])(
    'rejects an invalid postal code: %s',
    (postalCode) => {
      const result = guidedEnrollmentSchema.safeParse({
        ...validInput,
        address: { ...validInput.address, postalCode },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          'کد پستی باید ۱۰ رقم باشد.',
        );
      }
    },
  );
});
