import { ConflictError } from '../../common/errors';
import { isIranianNationalId, normalizeIranianDigits } from '../../common/iranian-national-id';

const serviceTypes = new Set(['BUS', 'MINIBUS', 'CAR', 'VAN']);
const paymentPlanTypes = new Set(['FULL', 'INSTALLMENTS']);
const relationshipTypes = new Set(['FATHER', 'MOTHER', 'OTHER']);
const iranianMobilePattern = /^09\d{9}$/;

export type StudentEnrollmentData = {
  id?: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate?: string;
  gender?: string;
};

export type ParentContactData = {
  firstName: string;
  lastName: string;
  nationalId: string;
  phoneNumber: string;
};

export type GuardianEnrollmentData = {
  firstName: string;
  lastName: string;
  nationalId: string;
  relationshipType: 'FATHER' | 'MOTHER' | 'OTHER';
  relationshipDescription?: string;
};

export type EmergencyContactData = {
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
};

export type GuidedEnrollmentData = {
  student: StudentEnrollmentData;
  guardian: GuardianEnrollmentData;
  father?: ParentContactData | null;
  mother?: ParentContactData | null;
  emergencyContact?: EmergencyContactData | null;
  address: {
    title: string;
    province: string;
    city: string;
    district?: string;
    streetAddress: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  school: { schoolId: string; educationLevel: string; grade: string };
  service: {
    serviceType: string;
    paymentPlanType: 'FULL' | 'INSTALLMENTS';
    parentNotes?: string;
  };
};

function sectionIsPresent(section: Record<string, unknown> | null | undefined): boolean {
  if (!section) return false;
  return Object.values(section).some((value) => value != null && String(value).trim() !== '');
}

function sectionIsComplete(section: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => String(section[key] ?? '').trim() !== '');
}

export function normalizeAndValidateGuidedEnrollment(
  input: GuidedEnrollmentData,
): GuidedEnrollmentData {
  const data: GuidedEnrollmentData = {
    ...input,
    student: {
      ...input.student,
      nationalId: normalizeIranianDigits(input.student.nationalId).trim(),
    },
    guardian: {
      ...input.guardian,
      nationalId: normalizeIranianDigits(input.guardian.nationalId).trim(),
    },
  };
  if (input.father) {
    data.father = {
      ...input.father,
      nationalId: normalizeIranianDigits(input.father.nationalId).trim(),
    };
  }
  if (input.mother) {
    data.mother = {
      ...input.mother,
      nationalId: normalizeIranianDigits(input.mother.nationalId).trim(),
    };
  }

  const required = [
    data.student.firstName,
    data.student.lastName,
    data.student.nationalId,
    data.guardian.firstName,
    data.guardian.lastName,
    data.guardian.nationalId,
    data.guardian.relationshipType,
    data.address.streetAddress,
    data.address.postalCode,
    data.school.schoolId,
    data.school.educationLevel,
    data.school.grade,
    data.service.serviceType,
  ];

  if (required.some((value) => !String(value ?? '').trim())) {
    throw new ConflictError(
      'INCOMPLETE_ENROLLMENT',
      'All required enrollment fields must be completed.',
    );
  }
  if (!relationshipTypes.has(data.guardian.relationshipType)) {
    throw new ConflictError(
      'INVALID_RELATIONSHIP',
      'The guardian relationship must be father, mother, or other.',
    );
  }
  if (
    data.guardian.relationshipType === 'OTHER' &&
    !String(data.guardian.relationshipDescription ?? '').trim()
  ) {
    throw new ConflictError(
      'RELATIONSHIP_DESCRIPTION_REQUIRED',
      'A relationship description is required when the guardian relationship is other.',
    );
  }
  if (![data.student.nationalId, data.guardian.nationalId].every(isIranianNationalId)) {
    throw new ConflictError(
      'INVALID_NATIONAL_ID',
      'A valid national ID is required for the student and the guardian.',
    );
  }

  const phoneNumbers: string[] = [];
  for (const parent of [data.father, data.mother]) {
    if (!parent || !sectionIsPresent(parent)) continue;
    if (!sectionIsComplete(parent, ['firstName', 'lastName', 'nationalId', 'phoneNumber'])) {
      throw new ConflictError(
        'INCOMPLETE_CONTACT',
        'Partially completed parent information must include all fields.',
      );
    }
    if (!isIranianNationalId(parent.nationalId)) {
      throw new ConflictError(
        'INVALID_NATIONAL_ID',
        'A valid national ID is required for every listed parent.',
      );
    }
    phoneNumbers.push(parent.phoneNumber);
  }
  if (data.emergencyContact && sectionIsPresent(data.emergencyContact)) {
    if (
      !sectionIsComplete(data.emergencyContact, [
        'firstName',
        'lastName',
        'relationship',
        'phoneNumber',
      ])
    ) {
      throw new ConflictError(
        'INCOMPLETE_CONTACT',
        'Partially completed emergency contact information must include all fields.',
      );
    }
    phoneNumbers.push(data.emergencyContact.phoneNumber);
  }
  if (phoneNumbers.some((phoneNumber) => !iranianMobilePattern.test(phoneNumber))) {
    throw new ConflictError('INVALID_PHONE_NUMBER', 'Valid Iranian mobile numbers are required.');
  }
  if (!Number.isFinite(data.address.latitude) || !Number.isFinite(data.address.longitude)) {
    throw new ConflictError('INVALID_LOCATION', 'A valid map location is required.');
  }
  if (!serviceTypes.has(data.service.serviceType)) {
    throw new ConflictError(
      'INVALID_VEHICLE_TYPE',
      'The selected vehicle type is not supported.',
    );
  }
  if (!paymentPlanTypes.has(data.service.paymentPlanType)) {
    throw new ConflictError(
      'INVALID_PAYMENT_PLAN',
      'Select full or installment payment for the remaining service amount.',
    );
  }

  return data;
}

export function guidedContractText(firstName: string, lastName: string): string {
  return `قرارداد ارائه خدمات حمل‌ونقل دانش‌آموزی

این قرارداد میان ثمین گشت مهر ایران و خانواده دانش‌آموز ${firstName} ${lastName} منعقد می‌شود. سامانه متعهد است با رعایت الزامات ایمنی، برنامه‌ریزی مسیر و هماهنگی با مدرسه، بیشترین تلاش خود را برای ارائه نوع سرویس درخواستی انجام دهد.

نوع خودرو، ساعت حرکت، مسیر و حتی نوع سرویس ممکن است بر اساس ظرفیت، شرایط ترافیکی، محدوده پوشش، تصمیم مدرسه و الزامات ایمنی تغییر کند. هر تغییر مؤثر پیش از شروع خدمت به خانواده اطلاع داده خواهد شد.

مبلغ ۴٬۰۰۰٬۰۰۰ تومان به‌عنوان پیش‌پرداخت ثابت ثبت‌نام دریافت می‌شود. مبلغ باقی‌مانده، تعداد اقساط و تاریخ سررسید هر قسط پس از برنامه‌ریزی نهایی توسط مدیریت تعیین و در حساب خانواده نمایش داده خواهد شد.

خانواده مسئول صحت اطلاعات دانش‌آموز، والدین، تماس اضطراری، نشانی و موقعیت ثبت‌شده است و متعهد می‌شود تغییرات را به‌موقع اعلام کند. آغاز نهایی سرویس منوط به تأیید ظرفیت و برنامه مسیر است.

با پذیرش این قرارداد، خانواده اعلام می‌کند تمام بندها را مطالعه کرده و با شرایط فوق موافق است.`;
}
