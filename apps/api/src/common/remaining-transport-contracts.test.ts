import { ArgumentMetadata, BadRequestException, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BoundedIdentifierPipe } from './transport-pipes';
import { GuidedEnrollmentDto, CreateRegistrationDto, CorrectionDto } from '../modules/registrations/registration.dto';
import { AdminCreateParentDto, CompleteFamilyDto, EmergencyMutationDto } from '../modules/families/presentation/family.dto';
import { AdminCreateStudentDto, CreateStudentDto } from '../modules/students/student.dto';
import { CreateAdminDto, RequestOtpDto, VerifyAuthOtpDto } from '../modules/identity/presentation/auth.controller';

const validation = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const body = <T>(value: unknown, metatype: new () => T) =>
  validation.transform(value, { type: 'body', metatype } as ArgumentMetadata);

describe('remaining API transport contracts', () => {
  it('rejects malformed UUID route identifiers and bounds audit identifiers', async () => {
    await expect(new ParseUUIDPipe().transform('not-uuid', { type: 'param' })).rejects.toBeInstanceOf(BadRequestException);
    expect(new BoundedIdentifierPipe().transform('REGISTRATION')).toBe('REGISTRATION');
    expect(() => new BoundedIdentifierPipe().transform('../secret')).toThrow(BadRequestException);
  });

  it('validates simple registration bodies and correction text bounds', async () => {
    await expect(body({ studentId: 'bad', academicYear: '2026', serviceType: 'OTHER' }, CreateRegistrationDto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(body({ message: 'x'.repeat(1001) }, CorrectionDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes and bounds the full nested guided-enrollment payload', async () => {
    const value = guided();
    const dto = await body(value, GuidedEnrollmentDto);
    expect(dto.father.phoneNumber).toBe('09120000000');
    expect(dto.guardian.relationshipType).toBe('MOTHER');
    expect(dto.address.latitude).toBe(35.7);
    await expect(body({ ...value, address: { ...value.address, latitude: 91 } }, GuidedEnrollmentDto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(body({ ...value, father: { ...value.father, injected: true } }, GuidedEnrollmentDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats optional contacts and guardian relationship as nullable or conditional', async () => {
    const value = guided();
    const stripped = await body(
      { ...value, father: null, mother: null, emergencyContact: null },
      GuidedEnrollmentDto,
    );
    expect(stripped.father).toBeNull();
    expect(stripped.mother).toBeNull();
    await expect(
      body({ ...value, guardian: { ...value.guardian, relationshipType: 'OTHER' } }, GuidedEnrollmentDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    const described = await body(
      {
        ...value,
        guardian: {
          ...value.guardian,
          relationshipType: 'OTHER',
          relationshipDescription: 'پدربزرگ',
        },
      },
      GuidedEnrollmentDto,
    );
    expect(described.guardian.relationshipDescription).toBe('پدربزرگ');
  });

  it('validates nested family and admin-parent payloads', async () => {
    await expect(body({ mother: {}, unexpected: true }, CompleteFamilyDto)).rejects.toBeInstanceOf(BadRequestException);
    const parent = await body({ parentType: 'MOTHER', firstName: 'A', lastName: 'B', nationalId: '۱۲۳۴۵۶۷۸۹۰', phoneNumber: '۰۹۱۲۰۰۰۰۰۰۰' }, AdminCreateParentDto);
    expect(parent.phoneNumber).toBe('09120000000');
    await expect(body({ phoneNumber: '123' }, EmergencyMutationDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires UUID ownership fields for admin student creation and bounds student text', async () => {
    await expect(body({ userId: 'bad' }, AdminCreateStudentDto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(body({ schoolId: 'bad', firstName: 'x'.repeat(101), lastName: 'B', nationalId: '1234567890', grade: '1' }, CreateStudentDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes OTP/admin phones and rejects unknown or malformed auth fields', async () => {
    const request = await body({ phoneNumber: '۰۹۱۲۰۰۰۰۰۰۰', role: 'PARENT' }, RequestOtpDto);
    expect(request.phoneNumber).toBe('09120000000');
    const verify = await body({ phoneNumber: '09120000000', role: 'PARENT', code: '۱۲۳۴۵۶' }, VerifyAuthOtpDto);
    expect(verify.code).toBe('123456');
    await expect(body({ username: 'admin', firstName: 'A', lastName: 'B', phoneNumber: '09120000000', privilege: 'root' }, CreateAdminDto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

function guided() {
  const parent = { firstName: 'A', lastName: 'B', nationalId: '۱۲۳۴۵۶۷۸۹۰', phoneNumber: '۰۹۱۲۰۰۰۰۰۰۰' };
  return {
    student: { firstName: 'S', lastName: 'T', nationalId: '1234567890' },
    guardian: { firstName: 'G', lastName: 'H', nationalId: '0499370899', relationshipType: 'MOTHER' },
    father: parent, mother: { ...parent, phoneNumber: '09120000001' },
    emergencyContact: { firstName: 'E', lastName: 'C', relationship: 'UNCLE', phoneNumber: '09120000002' },
    address: { title: 'Home', province: 'Tehran', city: 'Tehran', streetAddress: 'Street', postalCode: '1234567890', latitude: '35.7', longitude: '51.4' },
    school: { schoolId: '00000000-0000-4000-8000-000000000001', educationLevel: 'Primary', grade: '1' },
    service: { serviceType: 'BUS', paymentPlanType: 'FULL' },
  };
}
