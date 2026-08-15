import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ManagerStudentListQueryDto } from './school-manager.dto';

describe('ManagerStudentListQueryDto', () => {
  it('treats blank optional GET filters as absent', async () => {
    const query = plainToInstance(ManagerStudentListQueryDto, {
      query: '',
      educationLevel: '  ',
      grade: '',
      serviceType: '',
      registrationStatus: '',
      photoStatus: 'all',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({
      query: undefined,
      educationLevel: undefined,
      grade: undefined,
      serviceType: undefined,
      registrationStatus: undefined,
    });
  });

  it('accepts all documented student sort keys', async () => {
    for (const sortBy of ['name', 'nationalId', 'studentCode', 'educationLevel', 'grade']) {
      const query = plainToInstance(ManagerStudentListQueryDto, { sortBy, sortOrder: 'asc' });
      await expect(validate(query)).resolves.toHaveLength(0);
    }
  });
});
