import { describe, expect, it } from 'vitest';
import { driverEnrollmentSchema, hasReachedContractEnd, removeLatinLetters } from './driver-enrollment-schema';

const valid = {
  firstName:'علی',lastName:'رضایی',fatherName:'حسن',gender:'MALE',nationalId:'0084575948',phoneNumber:'09123456789',secondaryPhoneNumber:'',education:'DIPLOMA',homePhoneNumber:'02144225577',emergencyFirstName:'رضا',emergencyLastName:'احمدی',emergencyRelationship:'برادر',emergencyPhoneNumber:'09121111111',driverPhotoUploadId:'11111111-1111-4111-8111-111111111111',streetAddress:'تهران خیابان آزادی',postalCode:'1234567890',province:'تهران',city:'تهران',municipalityDistrict:'2',latitude:35.7,longitude:51.3,locationSelected:true,referrerName:'',referrerPhoneNumber:'',vehiclePhotoUploadId:'22222222-2222-4222-8222-222222222222',insuranceExpiresAt:'2030-01-01',vehicleType:'CAR',system:'سمند',modelYear:1400,technicalInspectionExpiresAt:'2030-01-01',plateLeft:'12',plateLetter:'ب',plateMiddle:'345',plateIran:'67',usageType:'PERSONAL',ownershipType:'SELF',contractFullyRead:true,contractAccepted:true,
} as const;

describe('driver enrollment validation', () => {
  it('removes Latin letters from Persian-only fields while typing or pasting', () => {
    expect(removeLatinLetters('Aliعلی Streetخیابان ۱۲')).toBe('علی خیابان ۱۲');
  });
  it('unlocks contract acceptance both at the scroll end and when no scrolling is needed', () => {
    expect(hasReachedContractEnd(280, 280, 0)).toBe(true);
    expect(hasReachedContractEnd(600, 280, 312)).toBe(true);
    expect(hasReachedContractEnd(600, 280, 100)).toBe(false);
  });
  it('accepts a complete enrollment', () => expect(driverEnrollmentSchema.safeParse(valid).success).toBe(true));
  it('accepts an optional mobile prefix and an eleven-digit Tehran home phone', () => {
    expect(driverEnrollmentSchema.safeParse({ ...valid, secondaryPhoneNumber: '09' }).success).toBe(true);
  });
  it('rejects a home phone without its 021 prefix', () => {
    expect(driverEnrollmentSchema.safeParse({ ...valid, homePhoneNumber: '44225577' }).success).toBe(false);
  });
  it('rejects Latin text and phone numbers matching the verified primary mobile', () => {
    const result = driverEnrollmentSchema.safeParse({ ...valid, firstName: 'Ali', secondaryPhoneNumber: valid.phoneNumber, emergencyPhoneNumber: valid.phoneNumber });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['firstName', 'secondaryPhoneNumber', 'emergencyPhoneNumber']));
  });
  it('requires an explicitly selected location', () => {
    expect(driverEnrollmentSchema.safeParse({ ...valid, locationSelected: false }).success).toBe(false);
  });
  it('rejects bad phones, incomplete plates, and an unread contract', () => {
    const result = driverEnrollmentSchema.safeParse({ ...valid, phoneNumber:'9123', plateMiddle:'12', contractFullyRead:false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['phoneNumber','plateMiddle','contractFullyRead']));
  });
});
