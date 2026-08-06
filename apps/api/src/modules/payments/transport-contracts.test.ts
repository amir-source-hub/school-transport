import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ConfigureInstallmentsDto, IdempotencyKeyPipe, OfflinePaymentDto } from './payment-request.dto';
import { AcceptPriceDto, CreatePriceDto } from '../pricing/pricing.dto';
import { CreateSchoolDto, UpdateSchoolDto } from '../schools/school.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const body = <T>(value: unknown, metatype: new () => T) =>
  pipe.transform(value, { type: 'body', metatype } as ArgumentMetadata);

describe('scoped transport contracts', () => {
  it('rejects unknown fields and invalid enum values', async () => {
    await expect(body({ planType: 'WEEKLY', injected: true }, AcceptPriceDto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(body({ name: 'School', schoolType: 'OTHER', genderType: 'MIXED', province: 'Tehran', city: 'Tehran', address: 'Street' }, CreateSchoolDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes Iranian digits and accepts bounded monetary limits', async () => {
    const dto = await body({ totalAmount: '۲۱۴۷۴۸۳۶۴۷', installmentCount: '۱۲' }, CreatePriceDto);
    expect(dto.totalAmount).toBe(2_147_483_647);
    expect(dto.installmentCount).toBe(12);
    await expect(body({ totalAmount: 2_147_483_648 }, CreatePriceDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bounds installment arrays, values, and dates', async () => {
    const dto = await body({ items: [{ amount: '۵۰۰۰', dueDate: '2026-09-23T00:00:00.000Z' }] }, ConfigureInstallmentsDto);
    expect(dto.items[0].amount).toBe(5000);
    await expect(body({ items: [] }, ConfigureInstallmentsDto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(body({ items: [{ amount: 0, dueDate: 'not-a-date' }] }, ConfigureInstallmentsDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates payment references and bounded optional text', async () => {
    const dto = await body({ paidAt: '2026-09-23T00:00:00.000Z', referenceNumber: '۱۲۳۴۵' }, OfflinePaymentDto);
    expect(dto.referenceNumber).toBe('12345');
    await expect(body({ paidAt: 'yesterday', referenceNumber: '' }, OfflinePaymentDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a bounded idempotency header', () => {
    const header = new IdempotencyKeyPipe();
    expect(header.transform(' request-123 ')).toBe('request-123');
    expect(() => header.transform(undefined)).toThrow(BadRequestException);
    expect(() => header.transform('bad key')).toThrow(BadRequestException);
    expect(() => header.transform(`a${'x'.repeat(128)}`)).toThrow(BadRequestException);
  });

  it('validates school nested arrays, phone normalization, and update bounds', async () => {
    const dto = await body({
      name: 'School', schoolType: 'PUBLIC', genderType: 'MIXED', province: 'Tehran', city: 'Tehran',
      address: 'Street', phoneNumber: '۰۲۱۱۲۳۴۵۶۷۸', educationOptions: [{ level: 'Primary', grades: ['1'] }],
    }, CreateSchoolDto);
    expect(dto.phoneNumber).toBe('02112345678');
    await expect(body({ educationOptions: [{ level: 'Primary', grades: ['1'], extra: true }] }, UpdateSchoolDto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
