'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/feedback/alert';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { normalizeDigits, isValidIranianNationalId } from '@/features/enrollment/national-id';
import { saveStudentCompanion, type Student } from './students-api';

export function StudentCompanionForm({ student }: { student: Student }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const companion = student.companion;
  async function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    data.nationalId = normalizeDigits(data.nationalId).replace(/\D/g, '');
    data.phoneNumber = normalizeDigits(data.phoneNumber).replace(/\D/g, '');
    if (!isValidIranianNationalId(data.nationalId)) { setMessage('کد ملی مراقب همراه معتبر نیست.'); return; }
    if (!/^09\d{9}$/.test(data.phoneNumber)) { setMessage('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'); return; }
    setBusy(true); setMessage('');
    try {
      await saveStudentCompanion(student.id, data as Parameters<typeof saveStudentCompanion>[1]);
      setMessage('مراقب همراه ثبت شد و دو صندلی برای این دانش‌آموز محاسبه می‌شود.');
      router.refresh();
    } catch (error) { setMessage(getApiErrorFeedback(error).message); }
    finally { setBusy(false); }
  }
  return <section id="student-companion">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><UserRoundPlus className="size-5" aria-hidden="true" /></span><div><h2 className="font-black">مراقب همراه دانش‌آموز</h2><p className="mt-1 text-sm leading-7 text-muted">در صورت ثبت مراقب، دانش‌آموز و مراقب کنار هم قرار می‌گیرند و مجموعاً دو صندلی از سرویس می‌گیرند.</p></div></div>
    {companion ? <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{[['نام', companion.firstName], ['نام خانوادگی', companion.lastName], ['نام پدر', companion.fatherName], ['کد ملی', companion.nationalId], ['شماره همراه', companion.phoneNumber], ['نسبت', { FAMILY: 'خانواده', CAREGIVER: 'پرستار', COACH: 'مربی' }[companion.relationship]]].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl> : <>
      <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm font-bold"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />این دانش‌آموز مراقب همراه دارد</label>
      {enabled && <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
        <Field label="نام"><Input name="firstName" required maxLength={100} /></Field><Field label="نام خانوادگی"><Input name="lastName" required maxLength={100} /></Field><Field label="نام پدر"><Input name="fatherName" required maxLength={100} /></Field><Field label="کد ملی"><Input name="nationalId" required inputMode="numeric" maxLength={10} dir="ltr" /></Field><Field label="شماره همراه"><Input name="phoneNumber" required inputMode="tel" maxLength={11} dir="ltr" /></Field><Field label="نسبت"><select name="relationship" className="min-h-12 w-full rounded-xl border border-border bg-white px-3"><option value="FAMILY">خانواده</option><option value="CAREGIVER">پرستار</option><option value="COACH">مربی</option></select></Field><div className="sm:col-span-2"><Button loading={busy}>ثبت مراقب همراه</Button></div>
      </form>}
    </>}
    {message && <div className="mt-4"><Alert tone="info" title="وضعیت مراقب همراه">{message}</Alert></div>}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-bold">{label}<span className="mt-2 block">{children}</span></label>; }
