import { OFFLINE_PREPAYMENT_AMOUNT_IRR, renderOfflineContract } from './offline-contract-template';

type Person = { firstName: string; lastName: string; nationalId: string; phoneNumber?: string };
export type OfflineContractEnrollmentData = {
  student: Person & { id?: string; birthDate?: string; gender?: string };
  guardian: Omit<Person, 'phoneNumber'> & {
    relationshipType: 'FATHER' | 'MOTHER' | 'OTHER';
    relationshipDescription?: string;
  };
  homePhone: string;
  father?: Person | null;
  mother?: Person | null;
  emergencyContact?: { firstName: string; lastName: string; relationship: string; phoneNumber: string } | null;
  address: { title: string; province: string; city: string; streetAddress: string; postalCode: string; latitude: number; longitude: number };
  school: { schoolId: string; educationLevel: string; grade: string };
  service: { serviceType: string; paymentPlanType: 'FULL' | 'INSTALLMENTS'; parentNotes?: string };
};

const relationshipLabels = { FATHER: 'پدر', MOTHER: 'مادر', OTHER: 'سایر اولیاء' } as const;
const serviceLabels: Record<string, string> = { BUS: 'اتوبوس', MINIBUS: 'مینی‌بوس', CAR: 'خودروی سواری', VAN: 'ون' };

function jalaliDate(value: Date) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran',
  }).format(value);
}

export function buildOfflineContractSnapshot(
  data: OfflineContractEnrollmentData,
  guardianPhone: string,
  schoolName: string,
  generatedAt: Date,
  studentId?: string,
  academicYear = '1405-1406',
) {
  const guardianRole = data.guardian.relationshipType === 'OTHER'
    ? data.guardian.relationshipDescription || relationshipLabels.OTHER
    : relationshipLabels[data.guardian.relationshipType];
  const rendered = renderOfflineContract({
    guardianFullName: `${data.guardian.firstName} ${data.guardian.lastName}`,
    guardianRole,
    studentFullName: `${data.student.firstName} ${data.student.lastName}`,
    studentNationalId: data.student.nationalId,
    educationLevel: data.school.educationLevel,
    grade: data.school.grade,
    fieldOfStudy: 'ندارد',
    academicYear: academicYear.replace('-', '–'),
    serviceAmountRial: OFFLINE_PREPAYMENT_AMOUNT_IRR.toLocaleString('fa-IR'),
    serviceAmountToman: (OFFLINE_PREPAYMENT_AMOUNT_IRR / 10).toLocaleString('fa-IR'),
    serviceAmountTomanWords: 'چهار میلیون و نهصد و نود و هفت هزار و هشتصد',
    paymentState: 'در انتظار پرداخت پیش‌ثبت‌نام',
    homeAddress: `${data.address.province}، ${data.address.city}، ${data.address.streetAddress}`,
    postalCode: data.address.postalCode,
    homePhone: data.homePhone,
    fatherMobile: data.guardian.relationshipType === 'FATHER' ? guardianPhone : data.father?.phoneNumber || 'ثبت نشده',
    motherMobile: data.guardian.relationshipType === 'MOTHER' ? guardianPhone : data.mother?.phoneNumber || 'ثبت نشده',
    emergencyPhone: data.emergencyContact?.phoneNumber || 'ثبت نشده',
    schoolName,
    serviceType: serviceLabels[data.service.serviceType] || data.service.serviceType,
    contractStartDate: '1405/07/01',
    decisionDeadline: '1405/06/15',
    generatedDate: jalaliDate(generatedAt),
  });
  return {
    schemaVersion: 1,
    ...rendered,
    generatedAt: generatedAt.toISOString(),
    enrollment: {
      student: { ...data.student, id: studentId ?? data.student.id },
      guardian: { ...data.guardian, phoneNumber: guardianPhone },
      father: data.father ?? null,
      mother: data.mother ?? null,
      emergencyContact: data.emergencyContact ?? null,
      address: data.address,
      school: { ...data.school, name: schoolName },
      service: data.service,
    },
    acceptance: null,
    contractText: rendered.pages.map((page) => page.join('\n\n')).join('\n\n---\n\n'),
  };
}
