'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { removeAdminStudentCompanion, saveAdminStudentCompanion, type AdminStudentDetail } from './admin-students-api';

export function AdminCompanionEditor({ student }: { student: AdminStudentDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const companion = student.companion;
  async function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries()) as Parameters<typeof saveAdminStudentCompanion>[1];
    setBusy(true); setError('');
    try { await saveAdminStudentCompanion(student.id, data); router.refresh(); }
    catch (caught) { setError(getApiErrorFeedback(caught).message); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-border bg-surface-paper p-5">
    <h2 className="font-black">مراقب همراه دانش‌آموز</h2><p className="mt-1 text-sm text-muted">در صورت ثبت، دو صندلی در مسیر محاسبه می‌شود. فقط مدیریت می‌تواند این مشخصات را اصلاح یا حذف کند.</p>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      {([['firstName','نام'],['lastName','نام خانوادگی'],['fatherName','نام پدر'],['nationalId','کد ملی'],['phoneNumber','شماره همراه']] as const).map(([key,label]) => <label key={key} className="text-sm font-bold">{label}<Input className="mt-1" name={key} defaultValue={companion?.[key] ?? ''} required /></label>)}
      <label className="text-sm font-bold">نسبت<select name="relationship" defaultValue={companion?.relationship ?? 'FAMILY'} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-white px-3"><option value="FAMILY">خانواده</option><option value="CAREGIVER">پرستار</option><option value="COACH">مربی</option></select></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button loading={busy}>{companion?'ذخیره تغییرات مراقب':'افزودن مراقب'}</Button>{companion && <Button type="button" variant="danger" disabled={busy} onClick={async () => { if (!window.confirm('مراقب همراه حذف شود؟')) return; setBusy(true); try { await removeAdminStudentCompanion(student.id); router.refresh(); } catch (caught) { setError(getApiErrorFeedback(caught).message); } finally { setBusy(false); } }}>حذف مراقب</Button>}</div>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </section>;
}
