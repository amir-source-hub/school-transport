'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import {
  getAdminStudentDetail,
  updateAdminStudent,
  type AdminStudentDetail,
} from '@/features/admin-students/admin-students-api';
import {
  createAdminFamilyAddress,
  createFamilyParent,
  updateAdminFamilyAddress,
  updateAdminFamilyEmergencyContact,
  updateFamilyParent,
} from '@/features/admin-families/admin-families-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { formatIrr, formatJalaliDate, formatPersianNumber } from '@/lib/formatters';

const LocationPicker = dynamic(
  () => import('@/components/common/location-picker').then((m) => ({ default: m.LocationPicker })),
  { ssr: false },
);

type SchoolOption = {
  id: string;
  name: string;
  educationOptions: { level: string; grades: string[] }[];
};

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  CONTRACT_PENDING: 'در انتظار قرارداد',
  CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  ENROLLED: 'پیش‌پرداخت انجام‌شده',
  CANCELLED: 'لغوشده',
  INSTALLMENTS_IN_PROGRESS: 'در حال پرداخت اقساط',
  PAYMENT_COMPLETED: 'تسویه کامل',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  GENERATED: 'صادرشده',
  ACCEPTED: 'پذیرفته‌شده',
  REJECTED: 'ردشده',
  REPLACED: 'جایگزین‌شده',
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  ACTIVE: 'فعال',
  COMPLETED: 'تکمیل‌شده',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  PAID: 'پرداخت‌شده',
};

export function StudentEditDialog({
  studentId,
  studentName,
  schools,
}: {
  studentId: string;
  studentName: string;
  schools: SchoolOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">ویرایش</Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-3xl"
        title={`ویرایش دانش‌آموز «${studentName}»`}
        description="مشخصات، سرپرست‌ها، نشانی و مدرسه از همین فرم ویرایش می‌شوند."
      >
        <div className="max-h-[72vh] overflow-y-auto pl-1">
          <StudentEditBody studentId={studentId} schools={schools} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StudentEditBody({ studentId, schools }: { studentId: string; schools: SchoolOption[] }) {
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getAdminStudentDetail(studentId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((caught) => {
        if (active) setError(getApiErrorFeedback(caught).message);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!detail) return <p className="text-sm text-muted">در حال بارگذاری...</p>;

  return <StudentEditForm detail={detail} schools={schools} />;
}

function StudentEditForm({
  detail,
  schools,
}: {
  detail: AdminStudentDetail;
  schools: SchoolOption[];
}) {
  const [latestUpdatedAt, setLatestUpdatedAt] = useState(detail.updatedAt);
  const router = useRouter();

  const refresh = () => router.refresh();

  return (
    <Tabs
      ariaLabel="بخش‌های ویرایش دانش‌آموز"
      items={[
        {
          value: 'identity',
          label: 'مشخصات',
          content: (
            <IdentityTab
              detail={detail}
              expectedUpdatedAt={latestUpdatedAt}
              onSaved={(updatedAt) => {
                setLatestUpdatedAt(updatedAt);
                refresh();
              }}
            />
          ),
        },
        {
          value: 'guardian',
          label: 'سرپرست و تماس',
          content: <GuardianTab detail={detail} />,
        },
        {
          value: 'address',
          label: 'نشانی و نقشه',
          content: <AddressTab detail={detail} />,
        },
        {
          value: 'school',
          label: 'مدرسه و سرویس',
          content: (
            <SchoolTab
              detail={detail}
              schools={schools}
              expectedUpdatedAt={latestUpdatedAt}
              onSaved={(updatedAt) => {
                setLatestUpdatedAt(updatedAt);
                refresh();
              }}
            />
          ),
        },
        {
          value: 'contract',
          label: 'قرارداد',
          content: <ContractTab detail={detail} />,
        },
        {
          value: 'payment',
          label: 'پرداخت',
          content: <PaymentTab detail={detail} />,
        },
      ]}
    />
  );
}

function SaveFeedback({ message, tone }: { message?: string; tone: 'error' | 'success' }) {
  if (!message) return null;
  return (
    <p className={`text-xs ${tone === 'error' ? 'text-danger' : 'text-success'}`}>{message}</p>
  );
}

function IdentityTab({
  detail,
  expectedUpdatedAt,
  onSaved,
}: {
  detail: AdminStudentDetail;
  expectedUpdatedAt: string;
  onSaved: (updatedAt: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [form, setForm] = useState({
    firstName: detail.firstName,
    lastName: detail.lastName,
    nationalId: detail.nationalId,
    birthDate: detail.birthDate ?? '',
    gender: detail.gender ?? '',
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      const updated = await updateAdminStudent(detail.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        nationalId: form.nationalId,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        expectedUpdatedAt,
      });
      onSaved(updated.updatedAt);
      setFeedback({ message: 'مشخصات ذخیره شد.', tone: 'success' });
    } catch (caught) {
      setFeedback({ message: getApiErrorFeedback(caught).message, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام
          <Input required value={form.firstName} onChange={(event) => set('firstName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">نام خانوادگی
          <Input required value={form.lastName} onChange={(event) => set('lastName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">کد ملی
          <Input required dir="ltr" inputMode="numeric" value={form.nationalId} onChange={(event) => set('nationalId', event.target.value)} />
        </label>
        <label className="text-sm font-bold">تاریخ تولد
          <JalaliDateInput value={form.birthDate} onChange={(value) => set('birthDate', value)} />
        </label>
        <label className="text-sm font-bold">جنسیت
          <Select
            value={form.gender}
            onValueChange={(value) => set('gender', value)}
            options={[
              { value: 'FEMALE', label: 'دختر' },
              { value: 'MALE', label: 'پسر' },
            ]}
            placeholder="انتخاب کنید"
          />
        </label>
      </div>
      <SaveFeedback message={feedback?.message} tone={feedback?.tone ?? 'success'} />
      <Button type="submit" loading={pending}>ذخیره مشخصات</Button>
    </form>
  );
}

function SchoolTab({
  detail,
  schools,
  expectedUpdatedAt,
  onSaved,
}: {
  detail: AdminStudentDetail;
  schools: SchoolOption[];
  expectedUpdatedAt: string;
  onSaved: (updatedAt: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [schoolId, setSchoolId] = useState(detail.schoolId);
  const school = schools.find((item) => item.id === schoolId);
  const currentLevel =
    school?.educationOptions.find((option) => option.grades.includes(detail.grade ?? ''))?.level ??
    (detail.className ?? '');
  const [educationLevel, setEducationLevel] = useState(
    school?.educationOptions.some((option) => option.level === currentLevel) ? currentLevel : '',
  );
  const [grade, setGrade] = useState(detail.grade ?? '');

  const selectSchool = (nextSchoolId: string) => {
    const nextSchool = schools.find((item) => item.id === nextSchoolId);
    const nextLevel = nextSchool?.educationOptions[0]?.level ?? '';
    setSchoolId(nextSchoolId);
    setEducationLevel(nextLevel);
    setGrade(nextSchool?.educationOptions[0]?.grades[0] ?? '');
  };
  const selectEducationLevel = (level: string) => {
    setEducationLevel(level);
    setGrade(school?.educationOptions.find((option) => option.level === level)?.grades[0] ?? '');
  };
  const gradeOptions =
    school?.educationOptions.find((option) => option.level === educationLevel)?.grades ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      const updated = await updateAdminStudent(detail.id, {
        schoolId,
        educationLevel,
        grade,
        expectedUpdatedAt,
      });
      onSaved(updated.updatedAt);
      setFeedback({ message: 'مدرسه و پایه ذخیره شد.', tone: 'success' });
    } catch (caught) {
      setFeedback({ message: getApiErrorFeedback(caught).message, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">مدرسه
          <Select
            value={schoolId}
            onValueChange={selectSchool}
            options={schools.map((item) => ({ value: item.id, label: item.name }))}
          />
        </label>
        <label className="text-sm font-bold">مقطع
          <Select
            value={educationLevel}
            onValueChange={selectEducationLevel}
            options={school?.educationOptions.map((option) => ({ value: option.level, label: option.level })) ?? []}
            disabled={!school}
          />
        </label>
        <label className="text-sm font-bold">پایه
          <Select
            value={grade}
            onValueChange={setGrade}
            options={gradeOptions.map((gradeOption) => ({ value: gradeOption, label: gradeOption }))}
            disabled={gradeOptions.length === 0}
          />
        </label>
      </div>
      <SaveFeedback message={feedback?.message} tone={feedback?.tone ?? 'success'} />
      <Button type="submit" loading={pending}>ذخیره مدرسه</Button>
    </form>
  );
}

type ParentFormValue = { firstName: string; lastName: string; nationalId: string; phoneNumber: string };

function ParentFields({
  title,
  familyId,
  parent,
  parentType,
}: {
  title: string;
  familyId: string;
  parent?: { id: string; parentType: string; firstName: string; lastName: string; nationalId: string; phoneNumber: string };
  parentType: 'FATHER' | 'MOTHER';
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [form, setForm] = useState<ParentFormValue>({
    firstName: parent?.firstName ?? '',
    lastName: parent?.lastName ?? '',
    nationalId: parent?.nationalId ?? '',
    phoneNumber: parent?.phoneNumber ?? '',
  });
  const set = (key: keyof ParentFormValue, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      if (parent) {
        await updateFamilyParent(familyId, parent.id, form);
      } else {
        await createFamilyParent(familyId, { ...form, parentType });
      }
      setFeedback({ message: `${title} ذخیره شد.`, tone: 'success' });
    } catch (caught) {
      setFeedback({ message: getApiErrorFeedback(caught).message, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm font-bold">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام
          <Input required value={form.firstName} onChange={(event) => set('firstName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">نام خانوادگی
          <Input required value={form.lastName} onChange={(event) => set('lastName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">کد ملی
          <Input required dir="ltr" inputMode="numeric" value={form.nationalId} onChange={(event) => set('nationalId', event.target.value)} />
        </label>
        <label className="text-sm font-bold">شماره همراه
          <Input required dir="ltr" inputMode="tel" value={form.phoneNumber} onChange={(event) => set('phoneNumber', event.target.value)} />
        </label>
      </div>
      <SaveFeedback message={feedback?.message} tone={feedback?.tone ?? 'success'} />
      <Button type="submit" loading={pending}>{parent ? 'ذخیره' : 'ثبت'}</Button>
    </form>
  );
}

function EmergencyFields({
  familyId,
  contact,
}: {
  familyId: string;
  contact?: { id: string; firstName: string; lastName: string; relationship: string; phoneNumber: string };
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [form, setForm] = useState({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    relationship: contact?.relationship ?? '',
    phoneNumber: contact?.phoneNumber ?? '',
  });
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      await updateAdminFamilyEmergencyContact(familyId, contact!.id, form);
      setFeedback({ message: 'تماس اضطراری ذخیره شد.', tone: 'success' });
    } catch (caught) {
      setFeedback({ message: getApiErrorFeedback(caught).message, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  if (!contact) {
    return <p className="text-sm text-muted">تماس اضطراری برای این خانواده ثبت نشده است.</p>;
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm font-bold">تماس اضطراری</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام
          <Input required value={form.firstName} onChange={(event) => set('firstName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">نام خانوادگی
          <Input required value={form.lastName} onChange={(event) => set('lastName', event.target.value)} />
        </label>
        <label className="text-sm font-bold">نسبت
          <Input required value={form.relationship} onChange={(event) => set('relationship', event.target.value)} />
        </label>
        <label className="text-sm font-bold">شماره همراه
          <Input required dir="ltr" inputMode="tel" value={form.phoneNumber} onChange={(event) => set('phoneNumber', event.target.value)} />
        </label>
      </div>
      <SaveFeedback message={feedback?.message} tone={feedback?.tone ?? 'success'} />
      <Button type="submit" loading={pending}>ذخیره</Button>
    </form>
  );
}

function GuardianTab({ detail }: { detail: AdminStudentDetail }) {
  const father = detail.parents.find((parent) => parent.parentType === 'FATHER');
  const mother = detail.parents.find((parent) => parent.parentType === 'MOTHER');
  const emergency = detail.emergencyContacts[0];
  return (
    <div className="space-y-8">
      <ParentFields title="اطلاعات پدر" familyId={detail.userId} parent={father} parentType="FATHER" />
      <ParentFields title="اطلاعات مادر" familyId={detail.userId} parent={mother} parentType="MOTHER" />
      <EmergencyFields familyId={detail.userId} contact={emergency} />
    </div>
  );
}

function AddressTab({ detail }: { detail: AdminStudentDetail }) {
  const address = detail.addresses[0];
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'success' }>();
  const [form, setForm] = useState({
    title: address?.title ?? '',
    province: address?.province ?? '',
    city: address?.city ?? '',
    district: address?.district ?? '',
    streetAddress: address?.streetAddress ?? '',
    postalCode: address?.postalCode ?? '',
  });
  const [latitude, setLatitude] = useState<number | null>(address?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(address?.longitude ?? null);
  const [coordsTouched, setCoordsTouched] = useState(false);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFeedback(undefined);
    try {
      const body = {
        title: form.title,
        province: form.province,
        city: form.city,
        district: form.district || undefined,
        streetAddress: form.streetAddress,
        postalCode: form.postalCode || undefined,
        ...(coordsTouched && latitude !== null && longitude !== null
          ? { latitude, longitude }
          : {}),
      };
      if (address) {
        await updateAdminFamilyAddress(detail.userId, address.id, body);
      } else {
        await createAdminFamilyAddress(detail.userId, body);
      }
      setFeedback({ message: 'نشانی ذخیره شد.', tone: 'success' });
    } catch (caught) {
      setFeedback({ message: getApiErrorFeedback(caught).message, tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">عنوان نشانی
          <Input required value={form.title} onChange={(event) => set('title', event.target.value)} />
        </label>
        <label className="text-sm font-bold">استان
          <Input required value={form.province} onChange={(event) => set('province', event.target.value)} />
        </label>
        <label className="text-sm font-bold">شهر
          <Input required value={form.city} onChange={(event) => set('city', event.target.value)} />
        </label>
        <label className="text-sm font-bold">منطقه
          <Input value={form.district} onChange={(event) => set('district', event.target.value)} />
        </label>
        <label className="text-sm font-bold">نشانی خیابان
          <Input required value={form.streetAddress} onChange={(event) => set('streetAddress', event.target.value)} />
        </label>
        <label className="text-sm font-bold">کد پستی
          <Input required dir="ltr" inputMode="numeric" value={form.postalCode} onChange={(event) => set('postalCode', event.target.value)} />
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">موقعیت روی نقشه</p>
        <div className="h-72 overflow-hidden rounded-lg border">
          <LocationPicker
            latitude={latitude ?? 35.6892}
            longitude={longitude ?? 51.389}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
              setCoordsTouched(true);
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          مختصات: {latitude !== null ? formatPersianNumber(latitude) : '—'}،{' '}
          {longitude !== null ? formatPersianNumber(longitude) : '—'}
        </p>
      </div>
      <SaveFeedback message={feedback?.message} tone={feedback?.tone ?? 'success'} />
      <Button type="submit" loading={pending}>ذخیره نشانی</Button>
    </form>
  );
}

function ContractTab({ detail }: { detail: AdminStudentDetail }) {
  const summary = detail.enrollmentSummary;
  const contract = summary?.contract;
  if (!summary) {
    return <p className="text-sm text-muted">برای این دانش‌آموز ثبت‌نامی ثبت نشده است.</p>;
  }
  if (!contract) {
    return <p className="text-sm text-muted">برای ثبت‌نام فعلی هنوز قراردادی صادر نشده است.</p>;
  }
  return (
    <div className="space-y-2 text-sm">
      <Row label="شماره قرارداد" value={contract.contractNumber} />
      <Row
        label="وضعیت قرارداد"
        value={CONTRACT_STATUS_LABELS[contract.contractStatus] ?? contract.contractStatus}
      />
      <Row label="نسخه قرارداد" value={formatPersianNumber(contract.versionNumber)} />
      <Row
        label="تاریخ صدور"
        value={contract.generatedAt ? formatJalaliDate(contract.generatedAt) : '—'}
      />
      <Row
        label="تاریخ پذیرش"
        value={contract.acceptedAt ? formatJalaliDate(contract.acceptedAt) : '—'}
      />
      <Row
        label="وضعیت ثبت‌نام"
        value={REGISTRATION_STATUS_LABELS[summary.registrationStatus] ?? summary.registrationStatus}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="font-bold text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PaymentTab({ detail }: { detail: AdminStudentDetail }) {
  const summary = detail.enrollmentSummary;
  const plan = summary?.plan;
  if (!summary || !plan) {
    return <p className="text-sm text-muted">برنامه پرداختی برای این دانش‌آموز ثبت نشده است.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <Row label="روش پرداخت" value={plan.planType === 'FULL' ? 'پرداخت یکجا' : 'پیش‌پرداخت و اقساط'} />
        <Row label="وضعیت برنامه" value={PLAN_STATUS_LABELS[plan.planStatus] ?? plan.planStatus} />
        <Row label="مبلغ کل" value={formatIrr(plan.totalAmount)} />
        <Row label="پیش‌پرداخت" value={formatIrr(plan.prepaymentAmount)} />
        <Row label="مبلغ باقی‌مانده" value={formatIrr(plan.remainingInstallmentAmount)} />
        <Row
          label="اقساط پرداخت‌شده"
          value={`${formatPersianNumber(plan.paidInstallmentCount)} از ${formatPersianNumber(plan.installmentCount)}`}
        />
      </div>
      {plan.scheduleItems.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted">
              <th className="py-2 text-right font-bold">نوع</th>
              <th className="py-2 text-right font-bold">مبلغ</th>
              <th className="py-2 text-right font-bold">وضعیت</th>
              <th className="py-2 text-right font-bold">سررسید</th>
            </tr>
          </thead>
          <tbody>
            {plan.scheduleItems.map((item) => (
              <tr key={`${item.itemType}-${item.sequenceNumber}`} className="border-b last:border-0">
                <td className="py-2">{item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${formatPersianNumber(item.sequenceNumber)}`}</td>
                <td className="py-2">{formatIrr(item.amount)}</td>
                <td className="py-2">{ITEM_STATUS_LABELS[item.itemStatus] ?? item.itemStatus}</td>
                <td className="py-2">{item.dueDate ? formatJalaliDate(item.dueDate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
