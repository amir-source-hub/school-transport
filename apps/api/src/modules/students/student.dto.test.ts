import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AdminUpdateStudentDto, CreateStudentDto, UpdateStudentDto, UpsertStudentCompanionDto } from './student.dto';

describe('student DTO validation', () => {
  it('normalizes a valid Persian-digit national ID', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      schoolId: '00000000-0000-4000-8000-000000000001',
      firstName: 'Ali',
      lastName: 'Ahmadi',
      nationalId: '۱۲۳۴۵۶۷۸۹۱',
      grade: '4',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nationalId).toBe('1234567891');
  });

  it('rejects an invalid national ID and missing required grade', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      schoolId: '00000000-0000-4000-8000-000000000001',
      firstName: 'Ali',
      lastName: 'Ahmadi',
      nationalId: 'not-a-number',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['nationalId', 'grade']));
  });

  it('rejects blank optional update fields', async () => {
    const dto = plainToInstance(UpdateStudentDto, { firstName: '' });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('firstName');
  });

  it('validates a full admin update payload', async () => {
    const dto = plainToInstance(AdminUpdateStudentDto, {
      firstName: 'Ali',
      lastName: 'Ahmadi',
      nationalId: '۱۲۳۴۵۶۷۸۹۱',
      birthDate: '2012-04-03',
      gender: 'MALE',
      schoolId: '00000000-0000-4000-8000-000000000001',
      educationLevel: 'ابتدایی',
      grade: 'چهارم',
      expectedUpdatedAt: '2026-08-08T05:00:00.000Z',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nationalId).toBe('1234567891');
  });

  it('rejects an invalid school id and expected date in the admin update dto', async () => {
    const dto = plainToInstance(AdminUpdateStudentDto, {
      schoolId: 'not-a-uuid',
      expectedUpdatedAt: 'not-a-date',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['schoolId', 'expectedUpdatedAt']));
  });

  it('normalizes and validates companion identity, phone, and relationship', async () => {
    const dto = plainToInstance(UpsertStudentCompanionDto, { firstName:'مریم', lastName:'احمدی', fatherName:'رضا', nationalId:'۱۲۳۴۵۶۷۸۹۱', phoneNumber:'۰۹۱۲۳۴۵۶۷۸۹', relationship:'CAREGIVER' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nationalId).toBe('1234567891');
    expect(dto.phoneNumber).toBe('09123456789');
  });

  it('rejects an unsupported companion relationship and invalid phone', async () => {
    const dto = plainToInstance(UpsertStudentCompanionDto, { firstName:'مریم', lastName:'احمدی', fatherName:'رضا', nationalId:'1234567891', phoneNumber:'02112345678', relationship:'FRIEND' });
    const properties=(await validate(dto)).map(error=>error.property);
    expect(properties).toEqual(expect.arrayContaining(['phoneNumber','relationship']));
  });
});
