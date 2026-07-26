'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  createAdminStudent,
  setAdminStudentActive,
  updateAdminStudent,
  type AdminStudent,
} from '@/features/admin-students/admin-students-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function ArchiveStudentDialog({ studentId, studentName, active }: { studentId: string; studentName: string; active: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await setAdminStudentActive(studentId, !active);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بایگانی دانش‌آموز');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">{active ? 'بایگانی' : 'بازیابی'}</Button>
      </DialogTrigger>
      <DialogContent title={active ? 'بایگانی دانش‌آموز' : 'بازیابی دانش‌آموز'} description={`دانش‌آموز «${studentName}» ${active ? 'بایگانی' : 'فعال'} می‌شود.`}>
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button variant={active ? 'danger' : 'primary'} loading={loading} onClick={handle}>تأیید</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Option = { id: string; name: string };

export function AdminStudentForm({
  families,
  schools,
  student,
  onSuccess,
}: {
  families: Option[];
  schools: Option[];
  student?: AdminStudent;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({
    userId: student?.userId ?? families[0]?.id ?? '',
    schoolId: student?.schoolId ?? schools[0]?.id ?? '',
    firstName: student?.firstName ?? '',
    lastName: student?.lastName ?? '',
    nationalId: student?.nationalId ?? '',
    birthDate: '',
    gender: '',
    grade: student?.grade ?? '',
    className: student?.className ?? '',
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      if (student) {
        await updateAdminStudent(student.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          grade: form.grade,
          className: form.className,
        });
      } else {
        await createAdminStudent(form);
      }
      onSuccess?.();
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {!student && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">خانواده<Select value={form.userId} onValueChange={(value) => set('userId', value)} options={families.map((item) => ({ value: item.id, label: item.name }))} /></label>
          <label className="text-sm font-bold">مدرسه<Select value={form.schoolId} onValueChange={(value) => set('schoolId', value)} options={schools.map((item) => ({ value: item.id, label: item.name }))} /></label>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام<Input required value={form.firstName} onChange={(event) => set('firstName', event.target.value)} /></label>
        <label className="text-sm font-bold">نام خانوادگی<Input required value={form.lastName} onChange={(event) => set('lastName', event.target.value)} /></label>
        {!student && <label className="text-sm font-bold">کد ملی<Input required dir="ltr" value={form.nationalId} onChange={(event) => set('nationalId', event.target.value)} /></label>}
        <label className="text-sm font-bold">پایه<Input required value={form.grade} onChange={(event) => set('grade', event.target.value)} /></label>
        <label className="text-sm font-bold">کلاس<Input value={form.className} onChange={(event) => set('className', event.target.value)} /></label>
        {!student && <label className="text-sm font-bold">تاریخ تولد<Input type="date" value={form.birthDate} onChange={(event) => set('birthDate', event.target.value)} /></label>}
        {!student && <label className="text-sm font-bold">جنسیت<Select value={form.gender} onValueChange={(value) => set('gender', value)} options={[{ value: 'FEMALE', label: 'دختر' }, { value: 'MALE', label: 'پسر' }]} /></label>}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending}>{student ? 'ذخیره تغییرات' : 'افزودن دانش‌آموز'}</Button>
    </form>
  );
}

export function AdminStudentDialog({ families, schools, student }: { families: Option[]; schools: Option[]; student?: AdminStudent }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={student ? 'ghost' : 'primary'} size="sm">{student ? 'ویرایش' : 'افزودن دانش‌آموز'}</Button></DialogTrigger>
      <DialogContent className="max-w-2xl" title={student ? 'ویرایش دانش‌آموز' : 'افزودن دانش‌آموز'} description="اطلاعات از این فرم مستقیماً در پایگاه داده ذخیره می‌شود.">
        <AdminStudentForm families={families} schools={schools} student={student} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
