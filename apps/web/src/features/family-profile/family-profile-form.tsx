'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  type FamilyProfile,
  updateAddress,
  updateEmergencyContact,
  updateParent,
} from './family-api';

export function FamilyProfileForm({ profile }: { profile: FamilyProfile }) {
  const router = useRouter();
  const address = profile.addresses.find(({ isActive }) => isActive) ?? profile.addresses[0];
  const emergency = profile.emergencyContacts.find(({ isActive }) => isActive) ?? profile.emergencyContacts[0];
  const [motherFirst, setMotherFirst] = useState(profile.mother?.firstName ?? '');
  const [motherLast, setMotherLast] = useState(profile.mother?.lastName ?? '');
  const [fatherFirst, setFatherFirst] = useState(profile.father?.firstName ?? '');
  const [fatherLast, setFatherLast] = useState(profile.father?.lastName ?? '');
  const [streetAddress, setStreetAddress] = useState(address?.streetAddress ?? '');
  const [emergencyFirst, setEmergencyFirst] = useState(emergency?.firstName ?? '');
  const [emergencyLast, setEmergencyLast] = useState(emergency?.lastName ?? '');
  const [relationship, setRelationship] = useState(emergency?.relationship ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(emergency?.phoneNumber ?? '');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <form className="space-y-6" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setSaved(false);
      try {
        const jobs: Promise<unknown>[] = [];
        if (profile.mother) jobs.push(updateParent('MOTHER', motherFirst, motherLast));
        if (profile.father) jobs.push(updateParent('FATHER', fatherFirst, fatherLast));
        if (address) jobs.push(updateAddress(address.id, { streetAddress }));
        if (emergency) jobs.push(updateEmergencyContact(emergency.id, { firstName: emergencyFirst, lastName: emergencyLast, relationship, phoneNumber: emergencyPhone }));
        await Promise.all(jobs); setSaved(true); router.refresh();
      } finally { setPending(false); }
    }}>
      <section className="rounded-lg border border-border bg-surface p-5"><h2 className="text-lg font-black">اطلاعات والدین</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام مادر<Input value={motherFirst} onChange={(event) => setMotherFirst(event.target.value)} /></label>
        <label className="text-sm font-bold">نام خانوادگی مادر<Input value={motherLast} onChange={(event) => setMotherLast(event.target.value)} /></label>
        <label className="text-sm font-bold">نام پدر<Input value={fatherFirst} onChange={(event) => setFatherFirst(event.target.value)} /></label>
        <label className="text-sm font-bold">نام خانوادگی پدر<Input value={fatherLast} onChange={(event) => setFatherLast(event.target.value)} /></label>
        <p className="text-sm text-muted" dir="ltr">{profile.mother?.phoneNumber}</p><p className="text-sm text-muted" dir="ltr">{profile.father?.phoneNumber}</p>
      </div></section>
      {address && <section className="rounded-lg border border-border bg-surface p-5"><h2 className="text-lg font-black">نشانی</h2><Textarea className="mt-4" value={streetAddress} onChange={(event) => setStreetAddress(event.target.value)} /></section>}
      {emergency && <section className="rounded-lg border border-border bg-surface p-5"><h2 className="text-lg font-black">تماس اضطراری</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Input value={emergencyFirst} onChange={(event) => setEmergencyFirst(event.target.value)} /><Input value={emergencyLast} onChange={(event) => setEmergencyLast(event.target.value)} /><Input value={relationship} onChange={(event) => setRelationship(event.target.value)} /><Input dir="ltr" value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} /></div></section>}
      {saved && <Alert title="اطلاعات ذخیره شد">تغییرات در حساب خانواده ثبت شد.</Alert>}
      <Button type="submit" loading={pending}>ذخیره تغییرات</Button>
    </form>
  );
}
