import type { DriverDetail } from './admin-drivers-api';

export const driverDocumentLabels: Record<string, string> = {
  DRIVER_PHOTO: 'عکس راننده',
  PROFILE_PHOTO: 'عکس پرسنلی',
  NATIONAL_CARD_FRONT: 'روی کارت ملی',
  NATIONAL_CARD_BACK: 'پشت کارت ملی',
  BIRTH_CERTIFICATE_PAGE_1: 'صفحه اول شناسنامه',
  BIRTH_CERTIFICATE_PAGE_2: 'صفحه دوم شناسنامه',
  DRIVER_LICENSE_FRONT: 'روی گواهینامه',
  DRIVER_LICENSE_BACK: 'پشت گواهینامه',
  CRIMINAL_RECORD_CERTIFICATE: 'گواهی سوءپیشینه',
  ADDICTION_TEST_CERTIFICATE: 'گواهی عدم اعتیاد',
  COMMITMENT_LETTER_RETURNED: 'تعهدنامه تکمیل‌شده (قدیمی)',
  ADDICTION_LETTER_RETURNED: 'نامه عدم اعتیاد تکمیل‌شده (قدیمی)',
  EDUCATION_CERTIFICATE: 'تصویر مدرک تحصیلی',
  POSTAL_CODE_CONFIRMATION: 'تأییدیه کدپستی',
  SCHOOL_SERVICE_INSURANCE_ENDORSEMENT: 'الحاقیه بیمه‌نامه سرویس مدرسه',
  TAXI_OPERATION_LICENSE: 'پروانه تاکسیرانی (مخصوص خودرو تاکسی)',
  VEHICLE_PHOTO: 'عکس خودرو',
  VEHICLE_CARD_FRONT: 'روی کارت خودرو',
  VEHICLE_CARD_BACK: 'پشت کارت خودرو',
  VEHICLE_TITLE_DOCUMENT: 'سند خودرو',
  TECHNICAL_INSPECTION_DOCUMENT: 'معاینه فنی',
  INSURANCE_POLICY_DOCUMENT: 'بیمه‌نامه شخص ثالث',
};

/** Current slots offered by the driver portal. Legacy uploads are appended separately. */
export const currentDriverDocumentTypes = [
  'DRIVER_PHOTO',
  'NATIONAL_CARD_FRONT',
  'BIRTH_CERTIFICATE_PAGE_1',
  'BIRTH_CERTIFICATE_PAGE_2',
  'DRIVER_LICENSE_FRONT',
  'DRIVER_LICENSE_BACK',
  'CRIMINAL_RECORD_CERTIFICATE',
  'ADDICTION_TEST_CERTIFICATE',
  'EDUCATION_CERTIFICATE',
  'POSTAL_CODE_CONFIRMATION',
  'SCHOOL_SERVICE_INSURANCE_ENDORSEMENT',
  'TAXI_OPERATION_LICENSE',
  'VEHICLE_PHOTO',
  'VEHICLE_CARD_FRONT',
  'VEHICLE_CARD_BACK',
  'VEHICLE_TITLE_DOCUMENT',
  'TECHNICAL_INSPECTION_DOCUMENT',
  'INSURANCE_POLICY_DOCUMENT',
] as const;

export type AdminDriverDocumentSlot = {
  documentType: string;
  document?: DriverDetail['documents'][number];
};

export function buildAdminDriverDocumentSlots(
  documents: DriverDetail['documents'],
): AdminDriverDocumentSlot[] {
  const currentTypes = new Set<string>(currentDriverDocumentTypes);
  return [
    ...currentDriverDocumentTypes.map((documentType) => ({
      documentType,
      document: documents.find((document) => document.documentType === documentType),
    })),
    ...documents
      .filter((document) => !currentTypes.has(document.documentType))
      .map((document) => ({ documentType: document.documentType, document })),
  ];
}
