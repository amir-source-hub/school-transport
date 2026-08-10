export type SchoolOption = {
  id: string;
  name: string;
  city: string;
  educationOptions: { level: string; grades: string[] }[];
};

export type SavedParent = {
  firstName: string;
  lastName: string;
  nationalId: string;
  phoneNumber: string;
};

export type SavedParents = {
  father: SavedParent | null;
  mother: SavedParent | null;
};

export type ExistingStudent = {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string | null;
  gender: string | null;
  grade: string | null;
  className: string | null;
};

export type EnrollmentDefaults = {
  address?: {
    title: string;
    province: string;
    city: string;
    streetAddress: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  emergencyContact?: {
    firstName: string;
    lastName: string;
    relationship: string;
    phoneNumber: string;
  };
  guardian?: {
    firstName: string;
    lastName: string;
    nationalId: string;
    relationshipType: 'FATHER' | 'MOTHER' | 'OTHER';
  };
};

export type EnrollmentFormState = {
  existingStudentId: string;
  studentFirst: string;
  studentLast: string;
  studentNationalId: string;
  birthDate: string;
  gender: string;
  studentPhone: string;
  homePhone: string;
  guardianFirst: string;
  guardianLast: string;
  guardianNationalId: string;
  guardianRelationshipType: string;
  guardianRelationshipDescription: string;
  guardianPhone: string;
  fatherFirst: string;
  fatherLast: string;
  fatherNationalId: string;
  fatherPhone: string;
  motherFirst: string;
  motherLast: string;
  motherNationalId: string;
  motherPhone: string;
  emergencyFirst: string;
  emergencyLast: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  addressTitle: string;
  province: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  locationSelected: boolean;
  schoolId: string;
  educationLevel: string;
  grade: string;
  serviceType: string;
  paymentPlanType: string;
  parentNotes: string;
};

const emptyForm: EnrollmentFormState = {
  existingStudentId: '',
  studentFirst: '',
  studentLast: '',
  studentNationalId: '',
  birthDate: '',
  gender: '',
  studentPhone: '',
  homePhone: '',
  guardianFirst: '',
  guardianLast: '',
  guardianNationalId: '',
  guardianRelationshipType: 'FATHER',
  guardianRelationshipDescription: '',
  guardianPhone: '',
  fatherFirst: '',
  fatherLast: '',
  fatherNationalId: '',
  fatherPhone: '',
  motherFirst: '',
  motherLast: '',
  motherNationalId: '',
  motherPhone: '',
  emergencyFirst: '',
  emergencyLast: '',
  emergencyRelationship: '',
  emergencyPhone: '',
  addressTitle: 'منزل',
  province: 'تهران',
  city: 'تهران',
  streetAddress: '',
  postalCode: '',
  latitude: 35.7219,
  longitude: 51.3347,
  locationSelected: false,
  schoolId: '',
  educationLevel: '',
  grade: '',
  serviceType: 'BUS',
  paymentPlanType: 'INSTALLMENTS',
  parentNotes: '',
};

export function createEnrollmentFormState({
  schools,
  savedParents,
  existingStudents,
  defaults,
  guardianPhone,
}: {
  schools: SchoolOption[];
  savedParents: SavedParents;
  existingStudents: ExistingStudent[];
  defaults: EnrollmentDefaults;
  guardianPhone?: string;
}): EnrollmentFormState {
  const firstSchool = schools[0];
  const firstLevel = firstSchool?.educationOptions[0];
  const firstExisting = existingStudents[0];
  const existingSchool = schools.find((school) => school.id === firstExisting?.schoolId);
  const existingLevel =
    existingSchool?.educationOptions.find((option) => option.level === firstExisting?.className) ??
    existingSchool?.educationOptions.find((option) =>
      option.grades.includes(firstExisting?.grade ?? ''),
    );

  return {
    ...emptyForm,
    existingStudentId: firstExisting?.id ?? '',
    studentFirst: firstExisting?.firstName ?? '',
    studentLast: firstExisting?.lastName ?? '',
    studentNationalId: firstExisting?.nationalId ?? '',
    birthDate: firstExisting?.birthDate ?? '',
    gender: firstExisting?.gender ?? '',
    guardianFirst: defaults.guardian?.firstName ?? '',
    guardianLast: defaults.guardian?.lastName ?? '',
    guardianNationalId: defaults.guardian?.nationalId ?? '',
    guardianRelationshipType: defaults.guardian?.relationshipType ?? '',
    guardianRelationshipDescription: '',
    guardianPhone: guardianPhone ?? '',
    fatherFirst: savedParents.father?.firstName ?? '',
    fatherLast: savedParents.father?.lastName ?? '',
    fatherNationalId: savedParents.father?.nationalId ?? '',
    fatherPhone: savedParents.father?.phoneNumber ?? '',
    motherFirst: savedParents.mother?.firstName ?? '',
    motherLast: savedParents.mother?.lastName ?? '',
    motherNationalId: savedParents.mother?.nationalId ?? '',
    motherPhone: savedParents.mother?.phoneNumber ?? '',
    emergencyFirst: defaults.emergencyContact?.firstName ?? '',
    emergencyLast: defaults.emergencyContact?.lastName ?? '',
    emergencyRelationship: defaults.emergencyContact?.relationship ?? '',
    emergencyPhone: defaults.emergencyContact?.phoneNumber ?? '',
    addressTitle: defaults.address?.title ?? emptyForm.addressTitle,
    province: defaults.address?.province ?? emptyForm.province,
    city: defaults.address?.city ?? emptyForm.city,
    streetAddress: defaults.address?.streetAddress ?? '',
    postalCode: defaults.address?.postalCode ?? '',
    latitude: defaults.address?.latitude ?? emptyForm.latitude,
    longitude: defaults.address?.longitude ?? emptyForm.longitude,
    locationSelected: Boolean(
      defaults.address?.latitude !== undefined && defaults.address?.longitude !== undefined,
    ),
    schoolId: firstExisting?.schoolId ?? firstSchool?.id ?? '',
    educationLevel: existingLevel?.level ?? firstLevel?.level ?? '',
    grade: firstExisting?.grade ?? existingLevel?.grades[0] ?? firstLevel?.grades[0] ?? '',
  };
}
