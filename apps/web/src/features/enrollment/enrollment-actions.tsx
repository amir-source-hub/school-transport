'use client';

import dynamic from 'next/dynamic';
import {
  BusFront,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  LocateFixed,
  LogOut,
  ShieldCheck,
  Truck,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

const LocationPicker = dynamic(
  () => import('@/components/common/location-picker').then((m) => ({ default: m.LocationPicker })),
  { ssr: false },
);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { getOnboardingState } from '@/features/auth/onboarding-session';
import { isValidIranianNationalId, nationalIdError, normalizeDigits } from './national-id';
import {
  composeMobileNumber,
  normalizeMobileInput,
  placeCaretAfterPrefix,
} from './input-normalizers';
import {
  acceptEnrollmentPrice,
  acceptGuidedContract,
  cancelEnrollment,
  createGuidedEnrollment,
  finalizeOnboarding,
  type EnrollmentMode,
  type GuidedEnrollmentResult,
} from './enrollments-api';
import {
  applyGuardianRelationship,
  createEnrollmentFormState,
  type EnrollmentDefaults,
  type ExistingStudent,
  type SavedParents,
  type SchoolOption,
} from './enrollment-form-model';
import type { GuardianInput, ServiceInput, StudentInput } from './enrollment-schema';
import { PhotoUploadCard } from '@/features/student-photos/photo-upload-card';
import { OfflinePaymentDestinationCard } from '@/features/finance/offline-payment-destination-card';
import { ContractReview } from '@/features/finance/contract-review';
import { clearEnrollmentDraft } from './enrollment-draft';
import {
  acceptAdminFamilyContract,
  createAdminFamilyEnrollment,
} from '@/features/admin-families/admin-families-api';
import { RecordPaymentOnBehalfDialog } from '@/features/admin-payments/payment-actions';
const stages = ['مشخصات', 'نشانی', 'مدرسه', 'سرویس و قرارداد'];

const vehicleOptions = [
  {
    value: 'BUS',
    label: 'اتوبوس',
    description: 'مناسب مسیرهای پرتراکم و گروه‌های بزرگ',
    icon: BusFront,
  },
  {
    value: 'MINIBUS',
    label: 'مینی‌بوس',
    description: 'مناسب مسیرهای محلی با ظرفیت متوسط',
    icon: Truck,
  },
  {
    value: 'CAR',
    label: 'خودرو سواری',
    description: 'ظرفیت کم و مسیرهای اختصاصی‌تر',
    icon: CarFront,
  },
  {
    value: 'VAN',
    label: 'ون',
    description: 'ظرفیت متوسط و دسترسی بهتر در محله‌ها',
    icon: BusFront,
  },
];

export function CreateEnrollmentForm({
  schools,
  savedParents,
  existingStudents,
  defaults,
  mode = 'panel',
  guardianPhone,
  capacityRemaining,
  adminFamilyId,
}: {
  schools: SchoolOption[];
  savedParents: SavedParents;
  existingStudents: ExistingStudent[];
  defaults: EnrollmentDefaults;
  mode?: EnrollmentMode;
  guardianPhone?: string;
  capacityRemaining?: number;
  adminFamilyId?: string;
}) {
  const router = useRouter();
  const effectiveGuardianPhone =
    guardianPhone ?? (mode === 'onboarding' ? (getOnboardingState().phoneNumber ?? '') : '');
  const onboardingGuardianNationalId =
    mode === 'onboarding' ? (getOnboardingState().nationalId ?? '') : '';
  const createInitialForm = () =>
    createEnrollmentFormState({
      schools,
      savedParents,
      existingStudents,
      defaults,
      guardianPhone: effectiveGuardianPhone,
    });
  const initialForm = createInitialForm();
  if (onboardingGuardianNationalId) {
    initialForm.guardianNationalId = onboardingGuardianNationalId;
  }
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<GuidedEnrollmentResult>();
  const [reviewedContractPages, setReviewedContractPages] = useState<number[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentInstructionsAccepted, setPaymentInstructionsAccepted] = useState(false);
  const [photoUploadId, setPhotoUploadId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [locationError, setLocationError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const submissionLockRef = useRef(false);

  useEffect(() => {
    clearEnrollmentDraft(window.sessionStorage, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'onboarding') return;
    let active = true;
    finalizeOnboarding()
      .then(() => {
        if (active) router.replace('/student/dashboard');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mode, router]);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  const fatherKeys: (keyof typeof form)[] = [
    'fatherFirst',
    'fatherLast',
    'fatherNationalId',
    'fatherPhone',
  ];
  const motherKeys: (keyof typeof form)[] = [
    'motherFirst',
    'motherLast',
    'motherNationalId',
    'motherPhone',
  ];
  const emergencyKeys: (keyof typeof form)[] = [
    'emergencyFirst',
    'emergencyLast',
    'emergencyRelationship',
    'emergencyPhone',
  ];
  function sectionStarted(name: 'father' | 'mother' | 'emergency') {
    const keys = name === 'father' ? fatherKeys : name === 'mother' ? motherKeys : emergencyKeys;
    return keys.some((key) => {
      const value = String(form[key]).trim();
      return value !== '' && !(key.toString().endsWith('Phone') && value === '09');
    });
  }
  function sectionOf(key: keyof typeof form): 'father' | 'mother' | 'emergency' | null {
    if (fatherKeys.includes(key)) return 'father';
    if (motherKeys.includes(key)) return 'mother';
    if (emergencyKeys.includes(key)) return 'emergency';
    return null;
  }

  function validateField(
    key: keyof typeof form,
    value: string | number | boolean,
  ): string | undefined {
    const text = String(value).trim();
    const persianTextFields = new Set<keyof typeof form>([
      'studentFirst',
      'studentLast',
      'studentFatherName',
      'guardianFirst',
      'guardianLast',
      'guardianRelationshipDescription',
      'fatherFirst',
      'fatherLast',
      'motherFirst',
      'motherLast',
      'emergencyFirst',
      'emergencyLast',
      'emergencyRelationship',
      'addressTitle',
      'province',
      'city',
      'streetAddress',
      'parentNotes',
    ]);
    const requiredFields: (keyof typeof form)[] = [
      'studentFirst',
      'studentLast',
      'studentFatherName',
      'studentNationalId',
      'birthDate',
      'gender',
      'guardianRelationshipType',
      'homePhone',
      'addressTitle',
      'province',
      'city',
      'streetAddress',
      'postalCode',
    ];
    requiredFields.push('guardianFirst', 'guardianLast', 'guardianNationalId');
    const section = sectionOf(key);
    if (section && !sectionStarted(section)) return undefined;
    if (requiredFields.includes(key) && !text) return 'پر کردن این فیلد اجباری است';
    if (persianTextFields.has(key) && /[A-Za-z]/.test(text)) {
      return 'فقط حروف فارسی مجاز است.';
    }
    if (key === 'guardianRelationshipDescription') {
      if (form.guardianRelationshipType === 'OTHER' && !text) return 'شرح نسبت را وارد کنید.';
      return undefined;
    }
    if (key === 'gender') return text ? undefined : 'انتخاب جنسیت اجباری است.';
    if (key === 'homePhone') {
      if (!text) return 'پر کردن این فیلد اجباری است';
      return /^\d{8}$/.test(normalizeDigits(text))
        ? undefined
        : 'شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.';
    }
    if (key === 'studentPhone') {
      if (!text) return undefined;
      return /^\d{9}$/.test(normalizeDigits(text))
        ? undefined
        : 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.';
    }
    if (
      ['studentNationalId', 'guardianNationalId', 'fatherNationalId', 'motherNationalId'].includes(
        key,
      )
    ) {
      return isValidIranianNationalId(text) ? undefined : nationalIdError;
    }
    if (['fatherPhone', 'motherPhone', 'emergencyPhone'].includes(key)) {
      return /^09\d{9}$/.test(normalizeDigits(text))
        ? undefined
        : 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.';
    }
    if (key === 'postalCode') {
      return /^\d{10}$/.test(normalizeDigits(text)) ? undefined : 'کد پستی باید ۱۰ رقم باشد.';
    }
    return undefined;
  }

  function set(key: keyof typeof form, value: string | number) {
    let normalizedValue = value;
    const persianOnlyKeys: (keyof typeof form)[] = [
      'studentFirst',
      'studentLast',
      'studentFatherName',
      'guardianFirst',
      'guardianLast',
      'guardianRelationshipDescription',
      'fatherFirst',
      'fatherLast',
      'motherFirst',
      'motherLast',
      'emergencyFirst',
      'emergencyLast',
      'emergencyRelationship',
      'addressTitle',
      'province',
      'city',
      'streetAddress',
      'parentNotes',
    ];
    if (typeof value === 'string' && persianOnlyKeys.includes(key)) {
      normalizedValue = value.replace(/[A-Za-z]/g, '');
    }
    if (
      typeof value === 'string' &&
      ['fatherPhone', 'motherPhone', 'emergencyPhone'].includes(key)
    ) {
      normalizedValue = normalizeMobileInput(value);
    }
    if (
      typeof value === 'string' &&
      [
        'studentNationalId',
        'guardianNationalId',
        'fatherNationalId',
        'motherNationalId',
        'postalCode',
      ].includes(key)
    ) {
      normalizedValue = normalizeDigits(value).replace(/\D/g, '').slice(0, 10);
    }
    setForm((current) => {
      const next = { ...current, [key]: normalizedValue };
      if (current.guardianRelationshipType === 'FATHER') {
        if (key === 'studentFatherName') next.guardianFirst = String(normalizedValue);
        if (key === 'studentLast') next.guardianLast = String(normalizedValue);
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, normalizedValue) }));
  }

  function validateVisibleFields(currentStep: number) {
    const keys: (keyof typeof form)[] =
      currentStep === 1
        ? [
            'studentFirst',
            'studentLast',
            'studentFatherName',
            'studentNationalId',
            'birthDate',
            'gender',
            'guardianRelationshipType',
            'guardianRelationshipDescription',
            'guardianFirst',
            'guardianLast',
            'guardianNationalId',
            'homePhone',
            ...(form.guardianRelationshipType === 'MOTHER' ? fatherKeys : []),
            ...(form.guardianRelationshipType === 'FATHER' ? motherKeys : []),
            ...emergencyKeys,
          ]
        : currentStep === 2
          ? ['addressTitle', 'province', 'city', 'streetAddress', 'postalCode']
          : [];
    const checkedErrors = Object.fromEntries(
      keys.map((key) => [key, validateField(key, form[key])]),
    );
    const nextErrors = Object.fromEntries(
      Object.entries(checkedErrors).filter(([, message]) => message),
    );
    setFieldErrors((current) => ({ ...current, ...checkedErrors }));
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      requestAnimationFrame(() => document.getElementById(`enrollment-${firstInvalid}`)?.focus());
      return false;
    }
    return true;
  }
  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === form.schoolId),
    [form.schoolId, schools],
  );
  const levelOptions = selectedSchool?.educationOptions ?? [];
  const gradeOptions =
    levelOptions.find(({ level }) => level === form.educationLevel)?.grades ?? [];
  const googleMapUrl = `https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=16`;

  function selectSchool(schoolId: string) {
    const school = schools.find(({ id }) => id === schoolId);
    const firstLevel = school?.educationOptions[0];
    setForm((current) => ({
      ...current,
      schoolId,
      educationLevel: firstLevel?.level ?? '',
      grade: firstLevel?.grades[0] ?? '',
    }));
  }

  function selectLevel(educationLevel: string) {
    const grades =
      selectedSchool?.educationOptions.find(({ level }) => level === educationLevel)?.grades ?? [];
    setForm((current) => ({
      ...current,
      educationLevel,
      grade: grades[0] ?? '',
      fieldOfStudy: educationLevel === 'متوسطه دوم' ? current.fieldOfStudy : '',
    }));
  }

  function selectExistingStudent(studentId: string) {
    if (studentId === '__NEW__') studentId = '';
    const student = existingStudents.find((item) => item.id === studentId);
    if (!student) {
      setForm((current) => ({
        ...current,
        existingStudentId: '',
        studentFirst: '',
        studentLast: '',
        studentFatherName: '',
        studentNationalId: '',
        birthDate: '',
        gender: '',
        schoolId: '',
        educationLevel: '',
        grade: '',
      }));
      return;
    }
    const school = schools.find((item) => item.id === student.schoolId);
    const level =
      school?.educationOptions.find((item) => item.level === student.className) ??
      school?.educationOptions.find((item) => item.grades.includes(student.grade ?? '')) ??
      school?.educationOptions[0];
    setForm((current) => ({
      ...current,
      existingStudentId: student.id,
      studentFirst: student.firstName,
      studentLast: student.lastName,
      studentFatherName: student.fatherName ?? '',
      studentNationalId: student.nationalId,
      birthDate: student.birthDate ?? '',
      gender: student.gender ?? '',
      schoolId: student.schoolId,
      educationLevel: level?.level ?? '',
      grade: student.grade ?? level?.grades[0] ?? '',
    }));
  }

  function useCurrentLocation() {
    setLocationError(undefined);
    if (!navigator.geolocation) {
      setLocationError('مرورگر شما امکان دریافت موقعیت مکانی را ندارد.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setForm((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
          locationSelected: true,
        })),
      (positionError) =>
        setLocationError(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'GPS گوشی را روشن کنید و در تنظیمات مرورگر، دسترسی Location این سایت را روی Allow قرار دهید؛ سپس دوباره تلاش کنید.'
            : 'موقعیت دریافت نشد. GPS را روشن کنید، در فضای دارای آنتن بمانید و دوباره تلاش کنید.',
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(undefined);
    if (!validateVisibleFields(step)) return;
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  }

  function validateStep(currentStep: number): string | null {
    if (currentStep === 1) {
      const requiredNames = [
        form.studentFirst,
        form.studentLast,
        form.studentFatherName,
        form.guardianRelationshipType,
        form.gender,
      ];
      requiredNames.push(form.guardianFirst, form.guardianLast);
      if (requiredNames.some((value) => !value.trim()))
        return 'تمام مشخصات فردی ضروری را تکمیل کنید.';
      if (!form.existingStudentId && !photoUploadId)
        return 'ارسال عکس دانش‌آموز برای ادامه ثبت‌نام الزامی است.';
    }
    const ids = [
      { key: 'کد ملی دانش‌آموز', value: form.studentNationalId },
      { key: 'کد ملی سرپرست', value: form.guardianNationalId },
    ];
    if (currentStep === 1 || currentStep === 4) {
      for (const { key, value } of ids) {
        if (!isValidIranianNationalId(value)) {
          return `${key} ${nationalIdError}`;
        }
      }
      if (
        form.guardianRelationshipType === 'OTHER' &&
        !form.guardianRelationshipDescription.trim()
      ) {
        return 'شرح نسبت را وارد کنید.';
      }
      if (form.guardianRelationshipType === 'MOTHER' && sectionStarted('father')) {
        if (!isValidIranianNationalId(form.fatherNationalId))
          return `کد ملی پدر ${nationalIdError}`;
        if (!/^09\d{9}$/.test(normalizeDigits(form.fatherPhone)))
          return 'شماره همراه پدر نامعتبر است.';
      }
      if (form.guardianRelationshipType === 'FATHER' && sectionStarted('mother')) {
        if (!isValidIranianNationalId(form.motherNationalId))
          return `کد ملی مادر ${nationalIdError}`;
        if (!/^09\d{9}$/.test(normalizeDigits(form.motherPhone)))
          return 'شماره همراه مادر نامعتبر است.';
      }
      if (sectionStarted('emergency')) {
        if (!/^09\d{9}$/.test(normalizeDigits(form.emergencyPhone)))
          return 'شماره همراه تماس اضطراری نامعتبر است.';
      }
      const people = [
        {
          label: 'دانش‌آموز',
          name: `${form.studentFirst} ${form.studentLast}`,
          nationalId: form.studentNationalId,
          phone: form.studentPhone ? composeMobileNumber(form.studentPhone) : '',
        },
        {
          label: 'سرپرست',
          name: `${form.guardianFirst} ${form.guardianLast}`,
          nationalId: form.guardianNationalId,
          phone: form.guardianPhone,
        },
        ...(form.guardianRelationshipType === 'MOTHER' && sectionStarted('father')
          ? [
              {
                label: 'پدر',
                name: `${form.fatherFirst} ${form.fatherLast}`,
                nationalId: form.fatherNationalId,
                phone: form.fatherPhone,
              },
            ]
          : []),
        ...(form.guardianRelationshipType === 'FATHER' && sectionStarted('mother')
          ? [
              {
                label: 'مادر',
                name: `${form.motherFirst} ${form.motherLast}`,
                nationalId: form.motherNationalId,
                phone: form.motherPhone,
              },
            ]
          : []),
        ...(sectionStarted('emergency')
          ? [
              {
                label: 'تماس اضطراری',
                name: `${form.emergencyFirst} ${form.emergencyLast}`,
                nationalId: '',
                phone: form.emergencyPhone,
              },
            ]
          : []),
      ].map((person) => ({
        ...person,
        name: person.name.trim().replace(/\s+/g, ' '),
        nationalId: normalizeDigits(person.nationalId),
        phone: normalizeDigits(person.phone),
      }));
      for (const key of ['name', 'nationalId', 'phone'] as const) {
        const seen = new Map<string, string>();
        for (const person of people) {
          const value = person[key];
          if (!value) continue;
          const previous = seen.get(value);
          if (previous) {
            const kind =
              key === 'name'
                ? 'نام و نام خانوادگی'
                : key === 'nationalId'
                  ? 'کد ملی'
                  : 'شماره همراه';
            return `${kind} ${previous} و ${person.label} نمی‌تواند یکسان باشد.`;
          }
          seen.set(value, person.label);
        }
      }
    }
    if (
      currentStep === 2 &&
      (!form.streetAddress.trim() ||
        !/^\d{10}$/.test(normalizeDigits(form.postalCode)) ||
        !form.locationSelected)
    ) {
      return 'نشانی کامل، کد پستی ۱۰ رقمی معتبر و موقعیت مکانی را وارد کنید.';
    }
    if (currentStep === 3 && (!form.schoolId || !form.educationLevel || !form.grade)) {
      return 'مدرسه، مقطع و پایه تحصیلی را انتخاب کنید.';
    }
    if (currentStep === 3 && form.educationLevel === 'متوسطه دوم' && !form.fieldOfStudy.trim()) {
      return 'رشته تحصیلی را وارد کنید.';
    }
    return null;
  }

  async function prepareContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submissionLockRef.current) return;
    const validationError = validateStep(4);
    if (validationError) {
      setError(validationError);
      return;
    }
    submissionLockRef.current = true;
    setPending(true);
    setError(undefined);
    try {
      const enrollmentInput = {
        studentPhotoUploadId: photoUploadId,
        student: {
          id: form.existingStudentId || undefined,
          firstName: form.studentFirst,
          lastName: form.studentLast,
          fatherName: form.studentFatherName,
          nationalId: normalizeDigits(form.studentNationalId),
          birthDate: form.birthDate || undefined,
          gender: form.gender as StudentInput['gender'],
          ...(form.studentPhone ? { phoneNumber: composeMobileNumber(form.studentPhone) } : {}),
        },
        guardian: {
          firstName: form.guardianFirst,
          lastName: form.guardianLast,
          nationalId: normalizeDigits(form.guardianNationalId),
          relationshipType: form.guardianRelationshipType as GuardianInput['relationshipType'],
          relationshipDescription:
            form.guardianRelationshipType === 'OTHER'
              ? form.guardianRelationshipDescription || undefined
              : undefined,
        },
        father:
          form.guardianRelationshipType === 'MOTHER' && sectionStarted('father')
            ? {
                firstName: form.fatherFirst,
                lastName: form.fatherLast,
                nationalId: normalizeDigits(form.fatherNationalId),
                phoneNumber: normalizeDigits(form.fatherPhone),
              }
            : null,
        mother:
          form.guardianRelationshipType === 'FATHER' && sectionStarted('mother')
            ? {
                firstName: form.motherFirst,
                lastName: form.motherLast,
                nationalId: normalizeDigits(form.motherNationalId),
                phoneNumber: normalizeDigits(form.motherPhone),
              }
            : null,
        emergencyContact: sectionStarted('emergency')
          ? {
              firstName: form.emergencyFirst,
              lastName: form.emergencyLast,
              relationship: form.emergencyRelationship,
              phoneNumber: normalizeDigits(form.emergencyPhone),
            }
          : null,
        homePhone: form.homePhone ? `021${normalizeDigits(form.homePhone)}` : '',
        address: {
          title: form.addressTitle,
          province: form.province,
          city: form.city,
          streetAddress: form.streetAddress,
          postalCode: normalizeDigits(form.postalCode),
          latitude: form.latitude,
          longitude: form.longitude,
        },
        school: {
          schoolId: form.schoolId,
          educationLevel: form.educationLevel,
          grade: form.grade,
          fieldOfStudy: form.educationLevel === 'متوسطه دوم' ? form.fieldOfStudy.trim() : undefined,
        },
        service: {
          serviceType: form.serviceType as ServiceInput['serviceType'],
          paymentPlanType: form.paymentPlanType as ServiceInput['paymentPlanType'],
          parentNotes: form.parentNotes || undefined,
        },
      };
      const created = adminFamilyId
        ? (await createAdminFamilyEnrollment(adminFamilyId, enrollmentInput)).data
        : await createGuidedEnrollment(enrollmentInput, mode);
      setResult(created);
    } catch (caught) {
      const feedback = getApiErrorFeedback(caught);
      const pathToField: Record<string, keyof typeof form> = {
        'student.firstName': 'studentFirst',
        'student.lastName': 'studentLast',
        'student.fatherName': 'studentFatherName',
        'student.nationalId': 'studentNationalId',
        'student.birthDate': 'birthDate',
        'student.phoneNumber': 'studentPhone',
        'guardian.firstName': 'guardianFirst',
        'guardian.lastName': 'guardianLast',
        'guardian.nationalId': 'guardianNationalId',
        'guardian.relationshipType': 'guardianRelationshipType',
        'guardian.relationshipDescription': 'guardianRelationshipDescription',
        'father.firstName': 'fatherFirst',
        'father.lastName': 'fatherLast',
        'father.nationalId': 'fatherNationalId',
        'father.phoneNumber': 'fatherPhone',
        'mother.firstName': 'motherFirst',
        'mother.lastName': 'motherLast',
        'mother.nationalId': 'motherNationalId',
        'mother.phoneNumber': 'motherPhone',
        'emergencyContact.firstName': 'emergencyFirst',
        'emergencyContact.lastName': 'emergencyLast',
        'emergencyContact.relationship': 'emergencyRelationship',
        'emergencyContact.phoneNumber': 'emergencyPhone',
        homePhone: 'homePhone',
        'address.title': 'addressTitle',
        'address.province': 'province',
        'address.city': 'city',
        'address.streetAddress': 'streetAddress',
        'address.postalCode': 'postalCode',
      };
      const serverErrors = Object.entries(feedback.fieldErrors ?? {}).flatMap(
        ([path, messages]) => {
          const key = pathToField[path];
          return key ? ([[key, messages[0]]] as const) : [];
        },
      );
      if (serverErrors.length > 0) {
        setFieldErrors((current) => ({ ...current, ...Object.fromEntries(serverErrors) }));
        requestAnimationFrame(() =>
          document.getElementById(`enrollment-${serverErrors[0][0]}`)?.focus(),
        );
      }
      setError(feedback.message);
    } finally {
      submissionLockRef.current = false;
      setPending(false);
    }
  }

  const lockedParentFields = new Set<keyof typeof form>([
    ...(savedParents.father
      ? (['fatherFirst', 'fatherLast', 'fatherNationalId', 'fatherPhone'] as const)
      : []),
    ...(savedParents.mother
      ? (['motherFirst', 'motherLast', 'motherNationalId', 'motherPhone'] as const)
      : []),
    ...(defaults.guardian
      ? (['guardianFirst', 'guardianLast', 'guardianNationalId'] as const)
      : []),
  ]);
  const reusingFamilyProfile =
    existingStudents.length > 0 && !form.existingStudentId && !adminFamilyId;
  if (reusingFamilyProfile) {
    for (const key of [
      'guardianRelationshipType',
      'guardianFirst',
      'guardianLast',
      'guardianNationalId',
      'fatherFirst',
      'fatherLast',
      'fatherNationalId',
      'fatherPhone',
      'motherFirst',
      'motherLast',
      'motherNationalId',
      'motherPhone',
      'addressTitle',
      'province',
      'city',
      'streetAddress',
      'postalCode',
      'emergencyFirst',
      'emergencyLast',
      'emergencyRelationship',
      'emergencyPhone',
    ] as const)
      lockedParentFields.add(key);
  }
  if (form.existingStudentId) {
    lockedParentFields.add('studentFirst');
    lockedParentFields.add('studentLast');
    lockedParentFields.add('studentNationalId');
  }
  if (mode === 'onboarding' && onboardingGuardianNationalId) {
    lockedParentFields.add('guardianNationalId');
  }
  if (form.guardianRelationshipType === 'FATHER') {
    lockedParentFields.add('guardianFirst');
    lockedParentFields.add('guardianLast');
  }
  const optionalSectionKeys = new Set<keyof typeof form>([
    ...fatherKeys,
    ...motherKeys,
    ...emergencyKeys,
  ]);
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="group/field">
      <label
        htmlFor={`enrollment-${key}`}
        className="text-sm font-extrabold text-slate-700 transition-colors group-focus-within/field:text-primary"
      >
        {label}
      </label>
      <Input
        id={`enrollment-${key}`}
        required={!optionalSectionKeys.has(key) && key !== 'guardianPhone'}
        type={type}
        value={String(form[key])}
        dir={['tel', 'number'].includes(type) ? 'ltr' : undefined}
        disabled={lockedParentFields.has(key)}
        inputMode={type === 'tel' ? 'numeric' : undefined}
        autoComplete={type === 'tel' ? 'off' : undefined}
        onFocus={(event) => {
          if (['fatherPhone', 'motherPhone', 'emergencyPhone'].includes(key)) {
            placeCaretAfterPrefix(event.currentTarget, 2);
          }
        }}
        onChange={(event) => set(key, event.target.value)}
        onBlur={(event) =>
          setFieldErrors((current) => ({
            ...current,
            [key]: validateField(key, event.target.value),
          }))
        }
        aria-invalid={Boolean(fieldErrors[key])}
        aria-describedby={fieldErrors[key] ? `enrollment-${key}-error` : undefined}
        className={`mt-2 border-slate-200 bg-white shadow-sm hover:border-primary/40 focus:bg-primary/[0.02] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${type === 'tel' ? 'text-left tabular-nums' : ''}`}
      />
      {fieldErrors[key] && (
        <p id={`enrollment-${key}-error`} className="mt-1 text-xs text-danger">
          {fieldErrors[key]}
        </p>
      )}
    </div>
  );
  const prefixField = (
    key: keyof typeof form,
    label: string,
    prefix: string,
    maxDigits: number,
  ) => (
    <div className="group/field">
      <label
        htmlFor={`enrollment-${key}`}
        className="text-sm font-extrabold text-slate-700 transition-colors group-focus-within/field:text-primary"
      >
        {label}
      </label>
      <div
        dir="ltr"
        className="mt-2 flex min-h-12 items-stretch overflow-hidden rounded-[var(--radius-control)] border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/40 focus-within:border-primary focus-within:bg-primary/[0.02] focus-within:shadow-[var(--shadow-focus)]"
      >
        <span className="flex select-none items-center border-r border-slate-200 px-3.5 text-sm font-bold text-slate-500 ltr">
          {prefix}
        </span>
        <Input
          id={`enrollment-${key}`}
          type="tel"
          inputMode="numeric"
          dir="ltr"
          required={key === 'homePhone'}
          value={String(form[key])}
          disabled={lockedParentFields.has(key)}
          onChange={(event) => {
            const digits = normalizeDigits(event.target.value).replace(/\D/g, '');
            if (digits.length > maxDigits) {
              setFieldErrors((current) => ({
                ...current,
                [key]:
                  key === 'homePhone'
                    ? 'شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.'
                    : 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
              }));
              return;
            }
            set(key, digits);
          }}
          onBlur={(event) =>
            setFieldErrors((current) => ({
              ...current,
              [key]: validateField(key, event.target.value),
            }))
          }
          aria-invalid={Boolean(fieldErrors[key])}
          aria-describedby={fieldErrors[key] ? `enrollment-${key}-error` : undefined}
          className="min-h-0 flex-1 rounded-none border-0 bg-transparent px-3.5 !text-left tabular-nums shadow-none hover:border-0 focus:border-0 focus:shadow-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
        />
      </div>
      {fieldErrors[key] && (
        <p id={`enrollment-${key}-error`} className="mt-1 text-xs text-danger">
          {fieldErrors[key]}
        </p>
      )}
    </div>
  );
  const fieldLabels: Partial<Record<keyof typeof form, string>> = {
    studentFirst: 'نام دانش‌آموز',
    studentLast: 'نام خانوادگی دانش‌آموز',
    studentFatherName: 'نام پدر دانش‌آموز',
    studentNationalId: 'کد ملی دانش‌آموز',
    birthDate: 'تاریخ تولد',
    gender: 'جنسیت',
    guardianFirst: 'نام سرپرست',
    guardianLast: 'نام خانوادگی سرپرست',
    guardianNationalId: 'کد ملی سرپرست',
    guardianRelationshipType: 'نسبت سرپرست',
    guardianRelationshipDescription: 'شرح نسبت',
    guardianPhone: 'شماره همراه سرپرست',
    homePhone: 'شماره تلفن منزل',
    studentPhone: 'شماره همراه دانش‌آموز',
    fatherFirst: 'نام پدر',
    fatherLast: 'نام خانوادگی پدر',
    fatherNationalId: 'کد ملی پدر',
    fatherPhone: 'شماره همراه پدر',
    motherFirst: 'نام مادر',
    motherLast: 'نام خانوادگی مادر',
    motherNationalId: 'کد ملی مادر',
    motherPhone: 'شماره همراه مادر',
    emergencyFirst: 'نام تماس اضطراری',
    emergencyLast: 'نام خانوادگی تماس اضطراری',
    emergencyRelationship: 'نسبت تماس اضطراری',
    emergencyPhone: 'شماره همراه تماس اضطراری',
    addressTitle: 'عنوان نشانی',
    province: 'استان',
    city: 'شهر',
    streetAddress: 'نشانی کامل',
    postalCode: 'کد پستی',
  };
  const visibleErrorEntries = Object.entries(fieldErrors).filter(([, message]) => message);
  const validationSummary = visibleErrorEntries.length > 0 && (
    <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm">
      <p className="font-black text-danger">لطفاً خطاهای زیر را اصلاح کنید:</p>
      <ul className="mt-2 space-y-1">
        {visibleErrorEntries.map(([key, message]) => (
          <li key={key}>
            <a
              className="font-bold text-danger underline underline-offset-4"
              href={`#enrollment-${key}`}
            >
              {fieldLabels[key as keyof typeof form] ?? key}: {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_25px_70px_-45px_rgba(15,23,42,.45)]">
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-4 sm:px-8 sm:py-6">
        <ol aria-label="مراحل ثبت‌نام" className="grid grid-cols-4 gap-1 sm:gap-2">
          {stages.map((label, index) => {
            const number = index + 1;
            const done = number < step || Boolean(result);
            return (
              <li
                key={label}
                aria-current={number === step ? 'step' : undefined}
                className="relative min-w-0 text-center"
              >
                {index > 0 && (
                  <span
                    className={`absolute left-1/2 right-[-50%] top-5 h-px ${number <= step ? 'bg-primary' : 'bg-slate-200'}`}
                  />
                )}
                <span
                  className={`relative mx-auto flex size-10 items-center justify-center rounded-full border-2 text-sm font-black ${done ? 'border-primary bg-primary text-white' : number === step ? 'border-primary bg-white text-primary' : 'border-slate-200 bg-white text-muted'}`}
                >
                  {done ? <Check className="size-4" /> : number.toLocaleString('fa-IR')}
                </span>
                <span
                  className={`mt-2 block truncate text-[10px] font-bold min-[360px]:text-[11px] sm:text-sm ${number <= step ? 'text-foreground' : 'text-muted'}`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="p-4 sm:p-8">
        <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
          مرحله {step.toLocaleString('fa-IR')} از ۴: {stages[step - 1]}
        </h2>
        {step === 1 && (
          <form noValidate onSubmit={next} className="space-y-7">
            {existingStudents.length > 0 && (
              <Section title="ادامه ثبت‌نام دانش‌آموز موجود">
                <label className="text-sm font-bold">
                  انتخاب دانش‌آموز
                  <Select
                    className="mt-2"
                    value={form.existingStudentId || '__NEW__'}
                    onValueChange={selectExistingStudent}
                    options={[
                      { value: '__NEW__', label: 'ثبت دانش‌آموز جدید' },
                      ...existingStudents.map((student) => ({
                        value: student.id,
                        label: `${student.firstName} ${student.lastName}`,
                      })),
                    ]}
                  />
                </label>
                <p className="mt-2 text-sm leading-7 text-muted">
                  دانش‌آموز افزوده‌شده توسط مدیریت را انتخاب کنید و اطلاعات سرویس، نشانی، قرارداد و
                  پیش‌پرداخت را تکمیل کنید.
                </p>
              </Section>
            )}
            <Section title="مشخصات دانش‌آموز">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {field('studentFirst', 'نام دانش‌آموز')}
                {field('studentLast', 'نام خانوادگی')}
                {field('studentFatherName', 'نام پدر')}
                {field('studentNationalId', 'کد ملی', 'tel')}
                {prefixField('studentPhone', 'شماره همراه دانش‌آموز', '09', 9)}
                <div className="text-sm font-bold">
                  <span>تاریخ تولد (شمسی)</span>
                  <div className="mt-2">
                    <JalaliDateInput
                      id="enrollment-birthDate"
                      value={form.birthDate}
                      onChange={(value) => set('birthDate', value)}
                      required
                      label="تاریخ تولد (شمسی)"
                      minDate="1900-01-01"
                      maxDate={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>
                <label className="text-sm font-bold">
                  جنسیت
                  <Select
                    value={form.gender}
                    onValueChange={(value) => set('gender', value)}
                    options={[
                      { value: 'FEMALE', label: 'دختر' },
                      { value: 'MALE', label: 'پسر' },
                    ]}
                    className="mt-2"
                  />
                </label>
              </div>
            </Section>
            <Section title="عکس پرسنلی دانش‌آموز برای صدور کارت سرویس">
              <PhotoUploadCard
                showHeading={false}
                studentId={form.existingStudentId || undefined}
                initialItems={[]}
                mode={adminFamilyId ? 'admin' : mode}
                familyId={adminFamilyId}
                onUploadCompleted={(uploadId) => {
                  if (!form.existingStudentId) setPhotoUploadId(uploadId);
                }}
              />
              {photoUploadId && (
                <p role="status" className="mt-3 text-sm font-bold text-success">
                  عکس در پیش‌نویس ثبت‌نام نگهداری شد و پس از ساخت دانش‌آموز به او متصل می‌شود.
                </p>
              )}
            </Section>
            <Section title="سرپرست">
              {defaults.guardian && (
                <p className="mb-4 text-sm text-muted">
                  مشخصات هویتی سرپرست از پروفایل خانواده خوانده شده است. نسبت سرپرست را می‌توانید
                  برای این ثبت‌نام اصلاح کنید.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-bold">
                  نسبت
                  <Select
                    className="mt-2"
                    value={form.guardianRelationshipType}
                    onValueChange={(value) => {
                      setForm((current) => applyGuardianRelationship(current, value));
                      setFieldErrors((current) => ({
                        ...current,
                        guardianFirst: undefined,
                        guardianLast: undefined,
                        guardianNationalId: undefined,
                        guardianRelationshipType: undefined,
                        guardianRelationshipDescription: undefined,
                      }));
                    }}
                    disabled={lockedParentFields.has('guardianRelationshipType')}
                    options={[
                      { value: 'FATHER', label: 'پدر' },
                      { value: 'MOTHER', label: 'مادر' },
                      { value: 'OTHER', label: 'سایر' },
                    ]}
                  />
                </label>
                {field('guardianFirst', 'نام')}
                {field('guardianLast', 'نام خانوادگی')}
                {field('guardianNationalId', 'کد ملی', 'tel')}
                {form.guardianRelationshipType === 'OTHER' && (
                  <div className="lg:col-span-2">
                    {field('guardianRelationshipDescription', 'شرح نسبت')}
                  </div>
                )}
                <div className="sm:col-span-1 lg:col-span-2">
                  <label
                    htmlFor="enrollment-guardianPhone"
                    className="text-sm font-bold text-foreground"
                  >
                    شماره همراه سرپرست
                  </label>
                  <Input
                    id="enrollment-guardianPhone"
                    type="tel"
                    dir="ltr"
                    value={form.guardianPhone}
                    disabled
                    readOnly
                    className="mt-2 cursor-not-allowed bg-surface-muted text-left tabular-nums text-muted"
                  />
                  <p className="mt-1 text-xs text-muted">
                    شماره تأییدشده هنگام ورود به حساب؛ قابل تغییر نیست.
                  </p>
                </div>
                <div className="sm:col-span-1 lg:col-span-2">
                  {prefixField('homePhone', 'شماره تلفن منزل', '021', 8)}
                </div>
              </div>
            </Section>
            {form.guardianRelationshipType === 'MOTHER' && (
              <Section title="اطلاعات پدر">
                {savedParents.father && (
                  <p className="mb-4 text-sm text-muted">
                    اطلاعات ذخیره‌شده پدر از پروفایل خانواده خوانده شده و در ثبت‌نام قابل تغییر
                    نیست.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {field('fatherFirst', 'نام')}
                  {field('fatherLast', 'نام خانوادگی')}
                  {field('fatherNationalId', 'کد ملی', 'tel')}
                  {field('fatherPhone', 'شماره همراه', 'tel')}
                </div>
              </Section>
            )}
            {form.guardianRelationshipType === 'FATHER' && (
              <Section title="اطلاعات مادر">
                {savedParents.mother && (
                  <p className="mb-4 text-sm text-muted">
                    اطلاعات ذخیره‌شده مادر از پروفایل خانواده خوانده شده و در ثبت‌نام قابل تغییر
                    نیست.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {field('motherFirst', 'نام')}
                  {field('motherLast', 'نام خانوادگی')}
                  {field('motherNationalId', 'کد ملی', 'tel')}
                  {field('motherPhone', 'شماره همراه', 'tel')}
                </div>
              </Section>
            )}
            <Section title="تماس اضطراری">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {field('emergencyFirst', 'نام')}
                {field('emergencyLast', 'نام خانوادگی')}
                {field('emergencyRelationship', 'نسبت')}
                {field('emergencyPhone', 'شماره همراه', 'tel')}
              </div>
            </Section>
            {validationSummary}
            <WizardFooter
              pending={pending}
              error={error}
              onExit={() => router.push(mode === 'onboarding' ? '/' : '/student/dashboard')}
            />
          </form>
        )}
        {step === 2 && (
          <form noValidate onSubmit={next} className="space-y-6">
            <Section title="نشانی محل سوار شدن">
              {reusingFamilyProfile && (
                <p className="mb-4 rounded-xl bg-primary-soft p-3 text-sm font-bold text-primary">
                  نشانی و اطلاعات خانواده از دانش‌آموز قبلی استفاده می‌شود و در این ثبت‌نام قابل
                  تغییر نیست.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {field('addressTitle', 'عنوان نشانی')}
                {field('province', 'استان')}
                {field('city', 'شهر')}
                <div className="sm:col-span-2">{field('streetAddress', 'نشانی کامل')}</div>
                {field('postalCode', 'کد پستی', 'tel')}
              </div>
            </Section>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">موقعیت روی نقشه</h3>
                  <p className="mt-1 text-xs text-muted">
                    روی نقشه کلیک کنید یا نشانگر را بکشید تا موقعیت دقیق را مشخص کنید.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={useCurrentLocation}
                    disabled={reusingFamilyProfile}
                  >
                    <LocateFixed className="size-4" />
                    دریافت موقعیت من
                  </Button>
                  <a
                    href={googleMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold"
                  >
                    <ExternalLink className="size-4" />
                    باز کردن نقشه
                  </a>
                </div>
              </div>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(lat, lng) =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    locationSelected: true,
                  }))
                }
                readOnly={reusingFamilyProfile}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="ورود دستی مختصات">
                <label className="text-sm font-bold">
                  عرض جغرافیایی
                  <Input
                    type="number"
                    inputMode="decimal"
                    dir="ltr"
                    step="any"
                    className="mt-1"
                    value={form.latitude}
                    disabled={reusingFamilyProfile}
                    onChange={(event) => set('latitude', Number(event.target.value))}
                    onBlur={() => setForm((current) => ({ ...current, locationSelected: true }))}
                  />
                </label>
                <label className="text-sm font-bold">
                  طول جغرافیایی
                  <Input
                    type="number"
                    inputMode="decimal"
                    dir="ltr"
                    step="any"
                    className="mt-1"
                    value={form.longitude}
                    disabled={reusingFamilyProfile}
                    onChange={(event) => set('longitude', Number(event.target.value))}
                    onBlur={() => setForm((current) => ({ ...current, locationSelected: true }))}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">
                برای دریافت خودکار موقعیت در گوشی، GPS را روشن و اجازه Location مرورگر را تأیید
                کنید. اگر نقشه در دسترس نیست، نشانی و مختصات را دستی وارد کنید.
              </p>
              {locationError && <p className="mt-2 text-sm text-danger">{locationError}</p>}
            </div>
            {validationSummary}
            <WizardFooter
              onBack={() => setStep(1)}
              pending={pending}
              error={error}
              onExit={() => router.push(mode === 'onboarding' ? '/' : '/student/dashboard')}
            />
          </form>
        )}
        {step === 3 && (
          <form noValidate onSubmit={next} className="space-y-7">
            <Section title="انتخاب مدرسه">
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="text-sm font-bold">
                  نام مدرسه
                  <Select
                    value={form.schoolId}
                    onValueChange={selectSchool}
                    options={schools.map((school) => ({
                      value: school.id,
                      label: `${school.name} — ${school.city}`,
                    }))}
                    placeholder="انتخاب کنید"
                    className="mt-2"
                  />
                </label>
                <label className="text-sm font-bold">
                  مقطع تحصیلی
                  <Select
                    value={form.educationLevel}
                    onValueChange={selectLevel}
                    options={levelOptions.map(({ level }) => ({ value: level, label: level }))}
                    placeholder="ابتدا مدرسه را انتخاب کنید"
                    className="mt-2"
                  />
                </label>
                <label className="text-sm font-bold">
                  پایه تحصیلی
                  <Select
                    value={form.grade}
                    onValueChange={(value) => set('grade', value)}
                    options={gradeOptions.map((grade) => ({ value: grade, label: grade }))}
                    placeholder="ابتدا مقطع را انتخاب کنید"
                    className="mt-2"
                  />
                </label>
                {form.educationLevel === 'متوسطه دوم' && (
                  <label className="text-sm font-bold">
                    رشته تحصیلی
                    <Select
                      value={form.fieldOfStudy}
                      onValueChange={(value) => set('fieldOfStudy', value)}
                      options={[
                        { value: 'ریاضی فیزیک', label: 'ریاضی فیزیک' },
                        { value: 'علوم تجربی', label: 'علوم تجربی' },
                        { value: 'علوم انسانی', label: 'علوم انسانی' },
                        { value: 'سایر', label: 'سایر' },
                      ]}
                      className="mt-2"
                    />
                  </label>
                )}
              </div>
            </Section>
            {selectedSchool && (
              <div className="flex items-center gap-4 rounded-2xl bg-primary-soft p-5">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary">
                  <ShieldCheck />
                </span>
                <div>
                  <p className="font-black">{selectedSchool.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {selectedSchool.city} · مدرسه فعال و تأییدشده
                  </p>
                </div>
              </div>
            )}
            <WizardFooter
              onBack={() => setStep(2)}
              pending={pending}
              error={error}
              onExit={() => router.push(mode === 'onboarding' ? '/' : '/student/dashboard')}
            />
          </form>
        )}
        {step === 4 && !result && (
          <form noValidate onSubmit={prepareContract} className="space-y-7">
            <Section title="نوع وسیله نقلیه">
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicleOptions.map(({ value, label, description, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('serviceType', value)}
                    className={`rounded-2xl border-2 p-5 text-right transition hover:-translate-y-0.5 hover:shadow-md ${form.serviceType === value ? 'border-primary bg-primary-soft' : 'border-slate-200 bg-white'}`}
                  >
                    <span
                      className={`mb-4 flex size-11 items-center justify-center rounded-xl ${form.serviceType === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <p className="font-black">{label}</p>
                    <p className="mt-2 text-sm text-muted">{description}</p>
                  </button>
                ))}
              </div>
            </Section>
            <div className="rounded-2xl border border-sun/30 bg-sun/10 p-5">
              <p className="font-black text-foreground">نکته مهم درباره نوع سرویس</p>
              <p className="mt-2 text-sm leading-7 text-muted">
                تمام تلاش ما ارائه سرویس انتخابی شماست؛ با این حال نوع نهایی سرویس ممکن است به دلیل
                ظرفیت خودرو، محدوده مسیر، شرایط ترافیکی، تصمیم مدرسه یا الزامات ایمنی تغییر کند. هر
                تغییر پیش از شروع خدمت اطلاع‌رسانی می‌شود.
              </p>
            </div>
            {capacityRemaining === 1 && !form.existingStudentId && (
              <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
                <p className="font-black text-danger">مسئولیت ثبت این دانش‌آموز</p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  این دانش‌آموز آخرین جای ظرفیت حساب خانواده را تکمیل می‌کند. با ثبت او، مسئولیت
                  پرداخت و رعایت تعهدات سرویس بر عهده شماست و تا تأیید درخواست افزایش ظرفیت، امکان
                  ثبت دانش‌آموز دیگری وجود نخواهد داشت.
                </p>
              </div>
            )}
            <Section title="روش پرداخت مبلغ باقی‌مانده">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    value: 'FULL',
                    title: 'پرداخت یکجا',
                    description:
                      'مدیریت مبلغ باقی‌مانده و یک سررسید را پس از بررسی مسیر تعیین می‌کند.',
                  },
                  {
                    value: 'INSTALLMENTS',
                    title: 'پرداخت اقساطی',
                    description:
                      'مدیریت تعداد اقساط، مبلغ هر قسط و تاریخ‌های شمسی را جداگانه تعیین می‌کند.',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set('paymentPlanType', option.value)}
                    className={`rounded-2xl border-2 p-5 text-right transition hover:-translate-y-0.5 hover:shadow-md ${
                      form.paymentPlanType === option.value
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-white'
                    }`}
                  >
                    <p className="font-black">{option.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{option.description}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                پیش‌پرداخت ثابت ۴٬۹۹۷٬۸۰۰ تومان در هر دو روش همین حالا پرداخت می‌شود.
              </p>
            </Section>
            <label className="text-sm font-bold">
              توضیحات
              <Textarea
                className="mt-2"
                value={form.parentNotes}
                onChange={(event) => set('parentNotes', event.target.value)}
              />
            </label>
            <WizardFooter
              onBack={() => setStep(3)}
              submitLabel="مشاهده قرارداد"
              pending={pending}
              error={error}
              onExit={() => router.push(mode === 'onboarding' ? '/' : '/student/dashboard')}
            />
          </form>
        )}
        {step === 4 && result && !accepted && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileCheck2 />
              </span>
              <div>
                <h3 className="font-black">مطالعه و پذیرش قرارداد</h3>
                <p className="text-sm text-muted">
                  برای فعال شدن پذیرش، متن را تا انتها مرور کنید.
                </p>
              </div>
            </div>
            <ContractReview
              contractId={result.contractId}
              version={1}
              templateHash={result.contractTemplateHash}
              pages={result.contractPages}
              canAct={false}
              onReviewedPagesChange={setReviewedContractPages}
            />
            <Button
              disabled={pending || reviewedContractPages.join(',') !== '1,2,3'}
              loading={pending}
              onClick={async () => {
                if (submissionLockRef.current) return;
                submissionLockRef.current = true;
                setPending(true);
                setError(undefined);
                try {
                  if (adminFamilyId) {
                    await acceptAdminFamilyContract(
                      result.contractId,
                      result.contractTemplateHash,
                      reviewedContractPages,
                    );
                  } else {
                    await acceptGuidedContract(
                      result.contractId,
                      result.contractTemplateHash,
                      reviewedContractPages,
                      mode,
                    );
                  }
                  setAccepted(true);
                } catch (caught) {
                  setError(getApiErrorFeedback(caught).message);
                } finally {
                  submissionLockRef.current = false;
                  setPending(false);
                }
              }}
            >
              پذیرش قرارداد و ادامه
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => setStep(3)}
              disabled={pending}
            >
              <ChevronRight className="size-4" />
              مرحله قبل
            </Button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        )}
        {step === 4 && result && accepted && !paid && (
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-sun text-navy">
              <WalletCards className="size-7" />
            </span>
            <h3 className="mt-5 text-2xl font-black">پرداخت پیش‌پرداخت ثبت‌نام</h3>
            <p className="mt-3 text-muted">مبلغ ثابت برای تمام دانش‌آموزان</p>
            <p className="mt-4 text-4xl font-black text-primary">
              ۴٬۹۹۷٬۸۰۰ <span className="text-base">تومان</span>
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-right text-sm leading-7 text-muted">
              {form.paymentPlanType === 'FULL'
                ? 'مبلغ باقی‌مانده و تاریخ پرداخت یکجا پس از بررسی مسیر توسط مدیریت تعیین و اعلام می‌شود.'
                : 'تعداد، مبلغ و تاریخ اقساط پس از بررسی مسیر توسط مدیریت تعیین و اعلام می‌شود.'}
            </div>
            {adminFamilyId ? (
              <div className="mt-6 space-y-4 text-right">
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-sm leading-7">
                  قرارداد با ثبت حسابرسی مدیریت پذیرفته شد. می‌توانید پیش‌پرداخت را اکنون همراه با
                  تصویر رسید ثبت کنید یا پرداخت را برای خانواده باقی بگذارید.
                </div>
                <OfflinePaymentDestinationCard />
                <RecordPaymentOnBehalfDialog
                  scheduleItemId={result.scheduleItemId}
                  label="پیش‌پرداخت"
                  onCompleted={() => setPaid(true)}
                />
              </div>
            ) : mode === 'onboarding' ? (
              <div className="mt-6 space-y-5 text-right">
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-sm leading-7">
                  مبلغ را به یکی از اطلاعات زیر واریز کنید و تصویر رسید را نگه دارید. پس از ورود به
                  پنل خانواده، از بخش «پرداخت‌ها» تصویر رسید را برای بررسی مدیریت ارسال می‌کنید.
                </div>
                <OfflinePaymentDestinationCard mode="onboarding" />
                <label className="flex min-h-12 items-start gap-3 rounded-xl border border-border p-4">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={paymentInstructionsAccepted}
                    onChange={(event) => setPaymentInstructionsAccepted(event.target.checked)}
                  />
                  <span className="text-sm font-bold leading-7">
                    مبلغ، اطلاعات حساب و لزوم نگهداری تصویر رسید را دیدم. پرداخت و ارسال رسید را از
                    پنل خانواده انجام می‌دهم.
                  </span>
                </label>
              </div>
            ) : (
              <div className="mt-6 space-y-5 text-right">
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4 text-sm leading-7">
                  قرارداد پذیرفته شد. برای جلوگیری از ثبت تکراری یا گم‌شدن وضعیت پرداخت، پرداخت و
                  ارسال رسید فقط از بخش «پرداخت‌ها» انجام می‌شود.
                </div>
                <OfflinePaymentDestinationCard />
                <Button className="w-full" onClick={() => router.push('/student/payments')}>
                  رفتن به بخش پرداخت‌ها
                </Button>
              </div>
            )}
            {mode === 'onboarding' && (
              <Button
                className="mt-4 w-full"
                variant="secondary"
                loading={pending}
                disabled={!paymentInstructionsAccepted || pending}
                onClick={async () => {
                  if (submissionLockRef.current) return;
                  submissionLockRef.current = true;
                  setPending(true);
                  setError(undefined);
                  try {
                    await finalizeOnboarding();
                    router.replace('/student/dashboard');
                  } catch (caught) {
                    setError(getApiErrorFeedback(caught).message);
                  } finally {
                    submissionLockRef.current = false;
                    setPending(false);
                  }
                }}
              >
                تأیید اطلاعات پرداخت و ورود به پنل خانواده
              </Button>
            )}
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        )}
        {paid && (
          <div className="py-8 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="size-8" />
            </span>
            <h3 className="mt-5 text-2xl font-black">ثبت‌نام دانش‌آموز تکمیل شد</h3>
            <p className="mt-3 text-muted">
              رسید پرداخت و وضعیت سرویس در همین حساب قابل پیگیری است.
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setStep(1);
                setResult(undefined);
                setAccepted(false);
                setPaid(false);
                setForm(createInitialForm());
              }}
            >
              ثبت دانش‌آموز دیگر
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-primary/[0.025] p-4 shadow-[0_12px_35px_-30px_rgba(15,23,42,.6)] transition-shadow hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,.5)] sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
        <span
          aria-hidden="true"
          className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-sky-400"
        />
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function WizardFooter({
  onBack,
  onExit,
  submitLabel = 'مرحله بعد',
  pending,
  error,
}: {
  onBack?: () => void;
  onExit?: () => void;
  submitLabel?: string;
  pending?: boolean;
  error?: string;
}) {
  return (
    <div className="-mx-4 border-t border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-24px_rgba(15,23,42,.5)] backdrop-blur sm:sticky sm:bottom-0 sm:z-20 sm:mx-0 sm:px-0">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-danger-soft p-3 text-sm font-bold text-danger"
        >
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {onExit && (
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="danger"
              onClick={onExit}
              disabled={pending}
            >
              <LogOut className="size-4" />
              خروج از فرم
            </Button>
          )}
          {onBack && (
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={pending}
            >
              <ChevronRight className="size-4" />
              مرحله قبل
            </Button>
          )}
        </div>
        <Button className="w-full sm:w-auto" type="submit" loading={pending} disabled={pending}>
          {submitLabel}
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function CancelEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      variant="danger"
      size="sm"
      onClick={async () => {
        await cancelEnrollment(id);
        router.refresh();
      }}
    >
      لغو درخواست
    </Button>
  );
}

export function AcceptPriceButton({
  enrollmentId,
  priceId,
  installmentAllowed,
}: {
  enrollmentId: string;
  priceId: string;
  installmentAllowed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await acceptEnrollmentPrice(
            enrollmentId,
            priceId,
            installmentAllowed ? 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS' : 'FULL',
          );
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      پذیرش قیمت
    </Button>
  );
}
