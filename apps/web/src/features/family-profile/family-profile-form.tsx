'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  CheckCircle2,
  Edit3,
  GraduationCap,
  Home,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Alert } from '@/components/feedback/alert';
import { LocationDisplay } from '@/components/common/location-display';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  type FamilyProfile,
  addEmergencyContact,
  updateAddress,
  updateEmergencyContact,
} from './family-api';
import type { Student } from '@/features/students/students-api';

const LocationPicker = dynamic(
  () => import('@/components/common/location-picker').then((module) => module.LocationPicker),
  { ssr: false },
);

type ProfileStudent = Student & { photoUrl: string | null };

export function FamilyProfileForm({
  profile,
  students,
}: {
  profile: FamilyProfile;
  students: ProfileStudent[];
}) {
  const guardianAsMother =
    profile.guardian?.relationshipType === 'MOTHER' ? profile.guardian : null;
  const guardianAsFather =
    profile.guardian?.relationshipType === 'FATHER' ? profile.guardian : null;
  const displayedMother = profile.mother ?? guardianAsMother;
  const displayedFather = profile.father ?? guardianAsFather;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [addressForms, setAddressForms] = useState(
    profile.addresses.map((address) => ({
      id: address.id,
      title: address.title,
      province: address.province,
      city: address.city,
      district: address.district ?? '',
      streetAddress: address.streetAddress,
      postalCode: address.postalCode ?? '',
      latitude: address.latitude,
      longitude: address.longitude,
    })),
  );
  const [emergencyForms, setEmergencyForms] = useState(
    (profile.emergencyContacts.length
      ? profile.emergencyContacts
      : [{ id: '', firstName: '', lastName: '', relationship: '', phoneNumber: '', isActive: true }]
    ).map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      relationship: contact.relationship,
      phoneNumber: contact.phoneNumber,
    })),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(undefined);
    const startedEmergencyForms = emergencyForms.filter((contact) =>
      [contact.firstName, contact.lastName, contact.relationship, contact.phoneNumber].some(
        Boolean,
      ),
    );
    const phones = startedEmergencyForms.map((contact) => contact.phoneNumber);
    if (phones.some((phone) => !/^09\d{9}$/.test(phone))) {
      setError('شماره‌های همراه باید ۱۱ رقم و با ۰۹ شروع شوند.');
      return;
    }
    setPending(true);
    try {
      const jobs: Promise<unknown>[] = [];
      jobs.push(
        ...addressForms.map(({ id, ...address }) =>
          updateAddress(id, {
            ...address,
            district: address.district || undefined,
            postalCode: address.postalCode || undefined,
          }),
        ),
        ...startedEmergencyForms.map(({ id, ...contact }) =>
          id ? updateEmergencyContact(id, contact) : addEmergencyContact(contact),
        ),
      );
      await Promise.all(jobs);
      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-5">
        {saved && <Alert title="اطلاعات ذخیره شد">تغییرات پروفایل خانواده ثبت شد.</Alert>}
        <div className="flex justify-end">
          <Button onClick={() => setEditing(true)}>
            <Edit3 className="size-4" /> ویرایش اطلاعات
          </Button>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ProfileSection icon={UsersRound} title="اطلاعات سرپرست و والدین">
            <ParentDetails label="سرپرست" parent={profile.guardian} />
            <ParentDetails label="مادر" parent={displayedMother} />
            <ParentDetails label="پدر" parent={displayedFather} />
          </ProfileSection>
          <ProfileSection icon={Home} title="همه نشانی‌های ثبت‌شده">
            {profile.addresses.length ? (
              <div className="space-y-5">
                {profile.addresses.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-surface-muted p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="font-black">{item.title}</h3>
                      {item.isActive && (
                        <span className="text-xs font-bold text-success">فعال</span>
                      )}
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <Detail label="استان و شهر" value={`${item.province}، ${item.city}`} />
                      <Detail label="منطقه" value={item.district ?? '—'} />
                      <Detail label="کد پستی" value={item.postalCode ?? '—'} ltr />
                      <div className="sm:col-span-2">
                        <Detail label="نشانی کامل" value={item.streetAddress} />
                      </div>
                    </dl>
                    {item.latitude != null && item.longitude != null ? (
                      <div className="mt-4">
                        <LocationDisplay latitude={item.latitude} longitude={item.longitude} />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted">
                        موقعیت نقشه برای این نشانی ثبت نشده است.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">نشانی ثبت نشده است.</p>
            )}
          </ProfileSection>
          <ProfileSection icon={Phone} title="تماس اضطراری">
            {profile.emergencyContacts.length ? (
              <div className="space-y-3">
                {profile.emergencyContacts.map((contact) => (
                  <dl
                    key={contact.id}
                    className="grid gap-3 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-2"
                  >
                    <Detail label="نام" value={`${contact.firstName} ${contact.lastName}`} />
                    <Detail label="نسبت" value={contact.relationship} />
                    <Detail label="شماره همراه" value={contact.phoneNumber} ltr />
                    <Detail label="وضعیت" value={contact.isActive ? 'فعال' : 'غیرفعال'} />
                  </dl>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">تماس اضطراری ثبت نشده است.</p>
            )}
          </ProfileSection>
          <ProfileSection icon={ShieldCheck} title="وضعیت حساب">
            <Detail label="نام کاربری" value={profile.username} />
            <p className="mt-3 text-xs leading-6 text-muted">
              با تغییر شماره اصلی، وضعیت تأیید شماره پاک می‌شود و شماره جدید باید دوباره تأیید شود.
            </p>
          </ProfileSection>
          <div className="lg:col-span-2">
            <ProfileSection icon={GraduationCap} title="اطلاعات دانش‌آموزان">
              {students.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {students.map((student) => (
                    <article
                      key={student.id}
                      className="flex gap-4 rounded-2xl border border-border bg-surface-muted p-4"
                    >
                      {student.photoUrl ? (
                        <Image
                          src={student.photoUrl}
                          alt={`عکس ${student.firstName} ${student.lastName}`}
                          width={96}
                          height={96}
                          unoptimized
                          className="size-24 shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <span className="grid size-24 shrink-0 place-items-center rounded-2xl bg-primary-soft text-xs font-bold text-primary">
                          بدون عکس
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <Detail label="نام" value={`${student.firstName} ${student.lastName}`} />
                          <Detail label="نام پدر" value={student.fatherName ?? '—'} />
                          <Detail label="کد ملی" value={student.nationalId} ltr />
                          <Detail label="تاریخ تولد" value={student.birthDate ?? '—'} />
                          <Detail
                            label="جنسیت"
                            value={
                              student.gender === 'FEMALE'
                                ? 'دختر'
                                : student.gender === 'MALE'
                                  ? 'پسر'
                                  : '—'
                            }
                          />
                          <Detail label="مدرسه" value={student.schoolName} />
                          <Detail
                            label="مقطع و پایه"
                            value={`${student.className ?? '—'}، ${student.grade ?? '—'}`}
                          />
                          <Detail label="رشته تحصیلی" value={student.fieldOfStudy ?? '—'} />
                          <Detail label="شماره همراه" value={student.phoneNumber ?? '—'} ltr />
                          <Detail label="وضعیت" value={student.isActive ? 'فعال' : 'غیرفعال'} />
                        </dl>
                        <ButtonLink
                          href={`/student/students/${student.id}`}
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                        >
                          ویرایش اطلاعات و عکس دانش‌آموز
                        </ButtonLink>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">دانش‌آموزی ثبت نشده است.</p>
              )}
            </ProfileSection>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <Alert title="اطلاعات هویتی قابل تغییر نیست">
        اطلاعات سرپرست و والدین پس از ثبت‌نام قفل است؛ فقط اطلاعات اختیاری نشانی و تماس اضطراری قابل
        ویرایش است.
      </Alert>
      {addressForms.map((addressForm, index) => (
        <EditSection key={addressForm.id} title={`نشانی: ${addressForm.title || 'بدون عنوان'}`}>
          <TextInput
            label="عنوان"
            value={addressForm.title}
            onChange={(value) =>
              setAddressForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="استان"
            value={addressForm.province}
            onChange={(value) =>
              setAddressForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, province: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="شهر"
            value={addressForm.city}
            onChange={(value) =>
              setAddressForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, city: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="منطقه"
            value={addressForm.district}
            optional
            onChange={(value) =>
              setAddressForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, district: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="کد پستی"
            value={addressForm.postalCode}
            ltr
            optional
            onChange={(value) =>
              setAddressForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, postalCode: value.replace(/\D/g, '').slice(0, 10) }
                    : item,
                ),
              )
            }
          />
          <label className="text-sm font-bold sm:col-span-2">
            نشانی کامل
            <Textarea
              required
              className="mt-2"
              value={addressForm.streetAddress}
              onChange={(event) =>
                setAddressForms((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, streetAddress: event.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-bold">موقعیت روی نقشه (اختیاری)</p>
            <LocationPicker
              latitude={addressForm.latitude ?? 35.7219}
              longitude={addressForm.longitude ?? 51.3347}
              onChange={(latitude, longitude) =>
                setAddressForms((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, latitude, longitude } : item,
                  ),
                )
              }
              showCoordinates={false}
            />
          </div>
        </EditSection>
      ))}
      {emergencyForms.map((emergencyForm, index) => (
        <EditSection key={emergencyForm.id} title="تماس اضطراری">
          <TextInput
            label="نام"
            value={emergencyForm.firstName}
            onChange={(value) =>
              setEmergencyForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, firstName: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="نام خانوادگی"
            value={emergencyForm.lastName}
            onChange={(value) =>
              setEmergencyForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, lastName: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="نسبت"
            value={emergencyForm.relationship}
            onChange={(value) =>
              setEmergencyForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, relationship: value } : item,
                ),
              )
            }
          />
          <TextInput
            label="شماره همراه"
            value={emergencyForm.phoneNumber}
            ltr
            onChange={(value) =>
              setEmergencyForms((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, phoneNumber: value.replace(/\D/g, '') } : item,
                ),
              )
            }
          />
        </EditSection>
      ))}
      {error && (
        <Alert tone="danger" title="ذخیره اطلاعات ناموفق بود">
          {error}
        </Alert>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          انصراف
        </Button>
        <Button type="submit" loading={pending}>
          <CheckCircle2 className="size-4" />
          ذخیره تغییرات
        </Button>
      </div>
    </form>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ParentDetails({ label, parent }: { label: string; parent: FamilyProfile['mother'] }) {
  if (!parent) return <p className="text-sm text-muted">اطلاعات {label} ثبت نشده است.</p>;
  return (
    <div className="mb-4 rounded-xl bg-surface-muted p-4 last:mb-0">
      <div className="flex items-center justify-between">
        <h3 className="font-black">
          {label}: {parent.firstName} {parent.lastName}
        </h3>
        {parent.isPrimaryContact && (
          <span className="text-xs font-bold text-primary">تماس اصلی</span>
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Detail label="کد ملی" value={parent.nationalId} ltr />
        <Detail label="شماره همراه" value={parent.phoneNumber} ltr />
        <Detail
          label="نسبت"
          value={
            parent.relationshipDescription ||
            (parent.relationshipType === 'FATHER'
              ? 'پدر'
              : parent.relationshipType === 'MOTHER'
                ? 'مادر'
                : parent.relationshipType === 'OTHER'
                  ? 'سایر بستگان'
                  : '—')
          }
        />
        <Detail label="تأیید شماره" value={parent.phoneVerified ? 'تأییدشده' : 'تأییدنشده'} />
      </dl>
    </div>
  );
}

function Detail({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-bold" dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  ltr,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ltr?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <Input
        required={!optional}
        className="mt-2"
        dir={ltr ? 'ltr' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
