'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateFamilyParent } from '@/features/admin-families/admin-families-api';
import { normalizeDigits } from '@/features/enrollment/national-id';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function ParentPhoneEditor({ familyId, parentId, phoneNumber }: { familyId: string; parentId: string; phoneNumber: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(phoneNumber);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  return <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(undefined); setSaved(false);
    try { await updateFamilyParent(familyId, parentId, { phoneNumber: phone }); setSaved(true); router.refresh(); }
    catch (caught) { setError(getApiErrorFeedback(caught).message); }
    finally { setBusy(false); }
  }}>
    <label className="text-xs font-bold">ویرایش شماره همراه
      <Input className="mt-1" dir="ltr" inputMode="tel" value={phone} onChange={(event) => setPhone(normalizeDigits(event.target.value).replace(/\D/g, '').slice(0, 11))} />
    </label>
    <Button type="submit" size="sm" loading={busy} disabled={!/^09\d{9}$/.test(phone) || phone === phoneNumber}>ذخیره شماره</Button>
    {error && <p role="alert" className="w-full text-danger">{error}</p>}
    {saved && <p role="status" className="w-full text-success">شماره ذخیره شد.</p>}
  </form>;
}
