import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AdminStudentListQueryDto } from './student-list.dto';

describe('AdminStudentListQueryDto', () => {
  it('uses safe defaults when no query parameters are sent', async () => {
    const dto = plainToInstance(AdminStudentListQueryDto, {});

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.archive).toBe('all');
    expect(dto.sort).toBe('createdAt');
    expect(dto.direction).toBe('desc');
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('accepts an explicit allowlisted filter set', async () => {
    const dto = plainToInstance(AdminStudentListQueryDto, {
      archive: 'active',
      sort: 'studentName',
      direction: 'asc',
      page: '3',
      pageSize: '50',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
  });

  it('rejects unknown archive, sort, and direction values', async () => {
    const dto = plainToInstance(AdminStudentListQueryDto, {
      archive: 'deleted',
      sort: 'nationalId',
      direction: 'sideways',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['archive', 'sort', 'direction']));
  });

  it('rejects page zero and out-of-range page sizes', async () => {
    const dto = plainToInstance(AdminStudentListQueryDto, {
      page: '0',
      pageSize: '500',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['page', 'pageSize']));
  });
});
