import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  CreateTransportRouteDto,
  DriverDocumentUploadDto,
  DriverEnrollmentDto,
  UpdateDriverProfileDto,
} from './driver-enrollment.dto';

describe('DriverEnrollmentDto', () => {
  it('requires a 24-digit IR IBAN, 16-digit card number, and bank name', async () => {
    const valid = plainToInstance(DriverEnrollmentDto, {
      iban: 'IR123456789012345678901234',
      cardNumber: '6037991234567890',
      bankName: 'بانک ملی',
    });
    const invalid = plainToInstance(DriverEnrollmentDto, {
      iban: 'IR123',
      cardNumber: '123',
      bankName: '',
    });
    expect((await validate(valid)).map((error) => error.property)).not.toEqual(
      expect.arrayContaining(['iban', 'cardNumber', 'bankName']),
    );
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['iban', 'cardNumber', 'bankName']),
    );
  });
  it('rejects excluded plate letters and malformed verified credentials', async () => {
    const dto = plainToInstance(DriverEnrollmentDto, {
      nationalId: '123',
      phoneNumber: '9123',
      plateNumber: '12ش34567',
    });
    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(
      expect.arrayContaining(['nationalId', 'phoneNumber', 'plateNumber']),
    );
  });
  it('allows safe profile fields but validates contact formats', async () => {
    const valid = plainToInstance(UpdateDriverProfileDto, {
      emergencyPhoneNumber: '09123456789',
      postalCode: '1234567890',
      streetAddress: 'تهران خیابان آزادی',
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(UpdateDriverProfileDto, {
      emergencyPhoneNumber: '123',
      postalCode: '12',
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['emergencyPhoneNumber', 'postalCode']),
    );
  });
});

describe('DriverDocumentUploadDto', () => {
  it('accepts the new bucket-backed PDF documents', async () => {
    const dto = plainToInstance(DriverDocumentUploadDto, {
      documentType: 'SCHOOL_SERVICE_INSURANCE_ENDORSEMENT',
      mimeType: 'application/pdf',
      size: 1024,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects removed returned-letter slots and unsupported file types', async () => {
    const dto = plainToInstance(DriverDocumentUploadDto, {
      documentType: 'COMMITMENT_LETTER_RETURNED',
      mimeType: 'application/octet-stream',
      size: 1024,
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['documentType', 'mimeType']),
    );
  });
});

describe('CreateTransportRouteDto contract terms', () => {
  const route = {
    driverId: '11111111-1111-4111-8111-111111111111',
    schoolId: '22222222-2222-4222-8222-222222222222',
    title: 'مسیر نمونه',
    academicYear: '1405-1406',
    direction: 'ROUND_TRIP',
    scheduledStartTime: '07:00',
    scheduledArrivalTime: '17:00',
    activeWeekdays: [0, 1],
    contractPriceRials: 2000000,
    contractDate: '1405/06/22',
  };
  it('accepts a nonnegative price and Persian date for a round-trip route', async () => {
    expect(await validate(plainToInstance(CreateTransportRouteDto, route))).toHaveLength(0);
  });
  it('rejects negative prices and invalid Persian dates', async () => {
    const errors = await validate(
      plainToInstance(CreateTransportRouteDto, {
        ...route,
        contractPriceRials: -1,
        contractDate: '2026-09-13',
      }),
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['contractPriceRials', 'contractDate']),
    );
  });
});
