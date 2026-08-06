import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';

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
});
