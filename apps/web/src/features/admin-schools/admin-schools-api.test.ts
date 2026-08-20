import { describe, expect, it } from 'vitest';

import { createSchoolSchema } from './admin-schools-api';

const validSchool = {
  name: 'مدرسه نمونه',
  schoolType: 'PUBLIC',
  genderType: 'FEMALE',
  province: 'تهران',
  city: 'تهران',
  address: 'نشانی مدرسه',
  phoneNumber: '02112345678',
  managerName: 'مدیر مدرسه',
  managerPhone: '09121234567',
  openingTime: '07:00',
  closingTime: '12:00',
  closingTimes: ['12:00'],
  latitude: 35.7219,
  longitude: 51.3347,
  educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }],
};

describe('createSchoolSchema', () => {
  it('shows a Persian error when an added closing time is empty', () => {
    const result = createSchoolSchema.safeParse({
      ...validSchool,
      closingTimes: ['12:00', '', ''],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      path: ['closingTimes', 1],
      message: 'همه ساعت‌های پایان مدرسه را وارد کنید',
    });
  });
});
