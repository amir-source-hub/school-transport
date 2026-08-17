'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Edit3, Home, Phone, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  type FamilyProfile,
  updateAddress,
  updateEmergencyContact,
} from './family-api';

export function FamilyProfileForm({ profile }: { profile: FamilyProfile }) {
  const guardianAsMother =
    profile.guardian?.relationshipType === 'MOTHER' ? profile.guardian : null;
  const guardianAsFather =
    profile.guardian?.relationshipType === 'FATHER' ? profile.guardian : null;
  const displayedMother = profile.mother ?? guardianAsMother;
  const displayedFather = profile.father ?? guardianAsFather;
  const router = useRouter();
  const address = profile.addresses.find(({ isActive }) => isActive) ?? profile.addresses[0];
  const emergency =
    profile.emergencyContacts.find(({ isActive }) => isActive) ?? profile.emergencyContacts[0];
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [addressForm, setAddressForm] = useState({
    title: address?.title ?? '',
    province: address?.province ?? '',
    city: address?.city ?? '',
    district: address?.district ?? '',
    streetAddress: address?.streetAddress ?? '',
    postalCode: address?.postalCode ?? '',
  });
  const [emergencyForm, setEmergencyForm] = useState({
    firstName: emergency?.firstName ?? '',
    lastName: emergency?.lastName ?? '',
    relationship: emergency?.relationship ?? '',
    phoneNumber: emergency?.phoneNumber ?? '',
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(undefined);
    const phones = [emergencyForm.phoneNumber];
    if (phones.some((phone) => !/^09\d{9}$/.test(phone))) {
      setError('شماره‌های همراه باید ۱۱ رقم و با ۰۹ شروع شوند.');
      return;
    }
    setPending(true);
    try {
      const jobs: Promise<unknown>[] = [];
      if (address) jobs.push(updateAddress(address.id, addressForm));
      if (emergency) jobs.push(updateEmergencyContact(emergency.id, emergencyForm));
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
          <ProfileSection icon={Home} title="نشانی فعال">
            {address ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="عنوان" value={address.title} />
                <Detail label="استان و شهر" value={`${address.province}، ${address.city}`} />
                <Detail label="کد پستی" value={address.postalCode ?? '—'} ltr />
                <div className="sm:col-span-2">
                  <Detail label="نشانی کامل" value={address.streetAddress} />
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted">نشانی ثبت نشده است.</p>
            )}
          </ProfileSection>
          <ProfileSection icon={Phone} title="تماس اضطراری">
            {emergency ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Detail label="نام" value={`${emergency.firstName} ${emergency.lastName}`} />
                <Detail label="نسبت" value={emergency.relationship} />
                <Detail label="شماره همراه" value={emergency.phoneNumber} ltr />
              </dl>
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
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <Alert title="اطلاعات هویتی قابل تغییر نیست">
        اطلاعات سرپرست و والدین پس از ثبت‌نام قفل است؛ فقط اطلاعات اختیاری نشانی و تماس اضطراری قابل ویرایش است.
      </Alert>
      {address && (
        <EditSection title="نشانی فعال">
          <TextInput
            label="عنوان"
            value={addressForm.title}
            onChange={(value) => setAddressForm((current) => ({ ...current, title: value }))}
          />
          <TextInput
            label="استان"
            value={addressForm.province}
            onChange={(value) => setAddressForm((current) => ({ ...current, province: value }))}
          />
          <TextInput
            label="شهر"
            value={addressForm.city}
            onChange={(value) => setAddressForm((current) => ({ ...current, city: value }))}
          />
          <TextInput
            label="منطقه"
            value={addressForm.district}
            onChange={(value) => setAddressForm((current) => ({ ...current, district: value }))}
          />
          <TextInput
            label="کد پستی"
            value={addressForm.postalCode}
            ltr
            onChange={(value) => setAddressForm((current) => ({ ...current, postalCode: value }))}
          />
          <label className="text-sm font-bold sm:col-span-2">
            نشانی کامل
            <Textarea
              required
              className="mt-2"
              value={addressForm.streetAddress}
              onChange={(event) =>
                setAddressForm((current) => ({ ...current, streetAddress: event.target.value }))
              }
            />
          </label>
        </EditSection>
      )}
      {emergency && (
        <EditSection title="تماس اضطراری">
          <TextInput
            label="نام"
            value={emergencyForm.firstName}
            onChange={(value) => setEmergencyForm((current) => ({ ...current, firstName: value }))}
          />
          <TextInput
            label="نام خانوادگی"
            value={emergencyForm.lastName}
            onChange={(value) => setEmergencyForm((current) => ({ ...current, lastName: value }))}
          />
          <TextInput
            label="نسبت"
            value={emergencyForm.relationship}
            onChange={(value) =>
              setEmergencyForm((current) => ({ ...current, relationship: value }))
            }
          />
          <TextInput
            label="شماره همراه"
            value={emergencyForm.phoneNumber}
            ltr
            onChange={(value) =>
              setEmergencyForm((current) => ({ ...current, phoneNumber: value.replace(/\D/g, '') }))
            }
          />
        </EditSection>
      )}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ltr?: boolean;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <Input
        required
        className="mt-2"
        dir={ltr ? 'ltr' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
