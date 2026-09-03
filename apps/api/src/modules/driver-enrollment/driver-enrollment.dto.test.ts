import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { DriverEnrollmentDto, UpdateDriverProfileDto } from './driver-enrollment.dto';

describe('DriverEnrollmentDto', () => {
  it('rejects excluded plate letters and malformed verified credentials', async () => {
    const dto = plainToInstance(DriverEnrollmentDto, { nationalId:'123', phoneNumber:'9123', plateNumber:'12س34567' });
    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['nationalId','phoneNumber','plateNumber']));
  });
  it('allows safe profile fields but validates contact formats', async () => {
    const valid = plainToInstance(UpdateDriverProfileDto, { emergencyPhoneNumber: '09123456789', postalCode: '1234567890', streetAddress: 'تهران خیابان آزادی' });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(UpdateDriverProfileDto, { emergencyPhoneNumber: '123', postalCode: '12' });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(expect.arrayContaining(['emergencyPhoneNumber', 'postalCode']));
  });
});
