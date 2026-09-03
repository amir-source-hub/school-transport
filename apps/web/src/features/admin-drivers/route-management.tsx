'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import type { AdminSchool } from '@/features/admin-schools/admin-schools-api';
import { getAdminStudents, type AdminStudent } from '@/features/admin-students/admin-students-api';
import {
  createAdminTransportRoute,
  type AdminTransportRoute,
  type DriverListItem,
} from './admin-drivers-api';

export function RouteManagement({
  routes,
  drivers,
  schools,
  students,
}: {
  routes: AdminTransportRoute[];
  drivers: DriverListItem[];
  schools: AdminSchool[];
  students: AdminStudent[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [choices, setChoices] = useState(students);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(students.length === 100);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [toId, setToId] = useState('');
  const [fromId, setFromId] = useState('');
  const student = choices.find((s) => s.id === studentId);
  const outbound = routes.find((r) => r.id === toId);
  const eligible = routes.filter((r) => r.school.id === student?.schoolId);
  const label = (r: AdminTransportRoute) =>
    `${r.title} · ${r.driver?.firstName ?? ''} ${r.driver?.lastName ?? ''} · ${r.students.length}/${r.driver?.capacity ?? 0}`;
  const full = (r: AdminTransportRoute) =>
    !r.students.some((s) => s.id === studentId) && r.students.length >= (r.driver?.capacity ?? 0);
  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setBusy(false);
    }
  }
  async function search(nextPage = 1, q = query) {
    await perform(async () => {
      const result = await getAdminStudents({
        q,
        page: nextPage,
        archive: 'active',
        pageSize: 100,
      });
      setChoices(result.students);
      setPage(nextPage);
      setHasMore(nextPage < result.pagination.totalPages);
      setSearchQuery(q);
      setStudentId('');
      setToId('');
      setFromId('');
    }, 'نتایج جست‌وجو به‌روز شد.');
  }
  async function create(data: FormData) {
    await perform(
      () =>
        createAdminTransportRoute({
          title: String(data.get('title')),
          driverId: String(data.get('driverId')),
          schoolId: String(data.get('schoolId')),
          academicYear: String(data.get('academicYear')),
          direction: String(data.get('direction')) as 'TO_SCHOOL' | 'FROM_SCHOOL',
          scheduledStartTime: String(data.get('start')),
          scheduledArrivalTime: String(data.get('end')),
          activeWeekdays: [0, 1, 2, 3, 4],
        }),
      'مسیر ایجاد شد.',
    );
  }
  async function assign(data: FormData) {
    await perform(
      () =>
        apiRequest('/admin/transport-assignments', {
          method: 'POST',
          body: {
            studentId,
            toSchoolRouteId: toId,
            fromSchoolRouteId: fromId,
            toSchoolStopTime: String(data.get('toStop')),
            fromSchoolStopTime: String(data.get('fromStop')),
          },
        }),
      'هر دو مسیر ذخیره و به خانواده و راننده اطلاع‌رسانی شد.',
    );
  }
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-black">۱. تعریف مسیر</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void create(new FormData(event.currentTarget));
          }}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="عنوان مسیر">
            <Input name="title" required minLength={2} />
          </Field>
          <Field label="راننده">
            <Picker
              name="driverId"
              options={drivers.map((d) => ({
                value: d.id,
                label: `${d.firstName} ${d.lastName} · ظرفیت ${d.capacity ?? 0}`,
              }))}
            />
          </Field>
          <Field label="مدرسه">
            <Picker
              name="schoolId"
              options={schools
                .filter((s) => s.isActive)
                .map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label="جهت">
            <Picker
              name="direction"
              options={[
                { value: 'TO_SCHOOL', label: 'رفت به مدرسه' },
                { value: 'FROM_SCHOOL', label: 'برگشت از مدرسه' },
              ]}
            />
          </Field>
          <Field label="شروع">
            <Input type="time" name="start" required />
          </Field>
          <Field label="پایان">
            <Input type="time" name="end" required />
          </Field>
          <Field label="سال تحصیلی">
            <Input name="academicYear" defaultValue="1405-1406" required />
          </Field>
          <Button className="self-end" loading={busy} disabled={busy}>
            ایجاد مسیر
          </Button>
        </form>
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer font-bold">
            مسیرهای تعریف‌شده ({routes.length.toLocaleString('fa-IR')})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {routes.map((r) => (
              <li key={r.id}>
                {label(r)} · {r.school.name} · {r.direction === 'TO_SCHOOL' ? 'رفت' : 'برگشت'} ·{' '}
                {r.scheduledStartTime} تا {r.scheduledArrivalTime}
              </li>
            ))}
          </ul>
        </details>
      </Card>
      <Card>
        <h2 className="text-lg font-black">۲. اتصال رفت و برگشت دانش‌آموز</h2>
        <p className="mt-2 text-sm text-muted">
          هر دو مسیر باید متعلق به یک راننده و مدرسه دانش‌آموز باشند. ذخیره، ارتباط قبلی همان سال را
          جایگزین می‌کند.
        </p>
        <div className="mt-5 flex gap-3">
          <Input
            aria-label="جست‌وجوی دانش‌آموز"
            placeholder="نام یا کد ملی دانش‌آموز"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="button" disabled={busy} onClick={() => void search()}>
            جست‌وجو
          </Button>
        </div>
        {(page > 1 || hasMore) && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Button
              type="button"
              disabled={busy || page <= 1}
              onClick={() => void search(page - 1, searchQuery)}
            >
              قبلی
            </Button>
            <span>صفحه {page.toLocaleString('fa-IR')}</span>
            <Button
              type="button"
              disabled={busy || !hasMore}
              onClick={() => void search(page + 1, searchQuery)}
            >
              بعدی
            </Button>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void assign(new FormData(event.currentTarget));
          }}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <Field label="دانش‌آموز">
            <Picker
              value={studentId}
              onChange={(v) => {
                setStudentId(v);
                setToId('');
                setFromId('');
              }}
              options={choices.map((s) => ({
                value: s.id,
                label: `${s.firstName} ${s.lastName} · ${s.schoolName ?? ''}`,
              }))}
            />
          </Field>
          <Field label="جست‌وجوی مسیر یا راننده">
            <Input value={routeQuery} onChange={(e) => setRouteQuery(e.target.value)} />
          </Field>
          <Field label="مسیر رفت">
            <Picker
              value={toId}
              onChange={(v) => {
                setToId(v);
                setFromId('');
              }}
              options={eligible
                .filter(
                  (r) =>
                    r.direction === 'TO_SCHOOL' && (r.id === toId || label(r).includes(routeQuery)),
                )
                .map((r) => ({ value: r.id, label: label(r), disabled: full(r) }))}
            />
          </Field>
          <Field label="مسیر برگشت همان راننده">
            <Picker
              value={fromId}
              onChange={setFromId}
              options={eligible
                .filter(
                  (r) =>
                    r.direction === 'FROM_SCHOOL' &&
                    r.driver?.id === outbound?.driver?.id &&
                    r.academicYear === outbound?.academicYear,
                )
                .map((r) => ({ value: r.id, label: label(r), disabled: full(r) }))}
            />
          </Field>
          <Field label="زمان سوار شدن در رفت">
            <Input
              key={toId}
              name="toStop"
              type="time"
              required
              defaultValue={outbound?.scheduledStartTime.slice(0, 5)}
            />
          </Field>
          <Field label="زمان رسیدن در برگشت">
            <Input
              key={fromId}
              name="fromStop"
              type="time"
              required
              defaultValue={routes.find((r) => r.id === fromId)?.scheduledArrivalTime.slice(0, 5)}
            />
          </Field>
          <Button disabled={busy || !studentId || !toId || !fromId} loading={busy}>
            ذخیره ارتباط و اطلاع‌رسانی
          </Button>
        </form>
        {student && (
          <div className="mt-5 rounded-xl bg-primary-soft p-4">
            <h3 className="font-bold">
              برنامه فعلی {student.firstName} {student.lastName}
            </h3>
            {routes
              .filter((r) => r.students.some((s) => s.id === studentId))
              .map((r) => (
                <p key={r.id} className="mt-2 text-sm">
                  {r.direction === 'TO_SCHOOL' ? 'رفت' : 'برگشت'}: {label(r)}
                </p>
              ))}
          </div>
        )}
        {message && (
          <p role="status" className="mt-4 text-sm">
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
function Picker({
  name,
  value,
  onChange,
  options,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      required
      className="min-h-12 w-full rounded-xl border border-border bg-white px-3"
    >
      <option value="">انتخاب کنید</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
          {o.disabled ? ' · ظرفیت تکمیل' : ''}
        </option>
      ))}
    </select>
  );
}
