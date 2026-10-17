'use client';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { SearchPicker } from '@/components/ui/search-picker';
import { normalizeDigits } from '@/features/enrollment/national-id';
import { isoToJalaliDate, jalaliToIsoDate } from '@/lib/jalali-date';
import type { AdminSchool } from '@/features/admin-schools/admin-schools-api';
import { getAdminStudents, type AdminStudent } from '@/features/admin-students/admin-students-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { ApiClientError } from '@/lib/api-client';
import {
  addStudentToAdminRoute,
  archiveAdminRoute,
  createAdminTransportRoute,
  removeStudentFromAdminRoute,
  updateAdminTransportRoute,
  type AdminTransportRoute,
  type DriverListItem,
} from './admin-drivers-api';
import { RouteCatalog } from './route-catalog';
import { RoutePriceInput, tomanToRials } from './route-price-input';
import {
  studentRouteAssignmentConflict,
  studentRouteAssignments,
} from './route-student-assignment';

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
  const [errorMessage, setErrorMessage] = useState('');
  const [contractDateIso, setContractDateIso] = useState(jalaliToIsoDate('1405/07/01') ?? '');
  const [schoolId, setSchoolId] = useState('');
  const [direction, setDirection] = useState<AdminTransportRoute['direction']>('TO_SCHOOL');
  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [choices, setChoices] = useState(students);
  const school = schools.find((s) => s.id === schoolId);
  const route = routes.find((r) => r.id === routeId);
  const assignmentYear =
    route?.academicYear ??
    routes
      .map((r) => r.academicYear)
      .sort()
      .at(-1);
  const assignments = useMemo(
    () => studentRouteAssignments(routes, assignmentYear),
    [routes, assignmentYear],
  );
  const visibleStudents = useMemo(
    () => choices.filter((s) => !filterSchoolId || s.schoolId === filterSchoolId),
    [choices, filterSchoolId],
  );
  async function perform(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    setMessage('');
    setErrorMessage('');
    try {
      await action();
      setMessage(success);
      router.refresh();
      return true;
    } catch (error) {
      const feedback = getApiErrorFeedback(error);
      const detail =
        error instanceof ApiClientError && error.status < 500 && !error.fieldErrors
          ? error.message
          : feedback.message;
      setErrorMessage(
        `${detail}${feedback.requestId ? ` (شناسه پیگیری: ${feedback.requestId})` : ''}`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const studentOption = useCallback(
    (s: AdminStudent) => {
      const assignment = assignments.get(s.id);
      const reason = studentRouteAssignmentConflict(assignment, route?.direction);
      return {
        value: s.id,
        label: `${s.firstName} ${s.lastName} · ${s.schoolName ?? ''}${s.companion ? ' · دارای همراه (۲ صندلی)' : ''}`,
        detail: s.address ? `آدرس: ${s.address}` : 'آدرسی برای این دانش‌آموز ثبت نشده است.',
        assignment,
        disabled: Boolean(reason),
        reason,
      };
    },
    [assignments, route?.direction],
  );
  const searchStudents = useCallback(
    async (q: string) => {
      const first = await getAdminStudents({
        q,
        schoolId: filterSchoolId || undefined,
        archive: 'active',
        pageSize: 100,
        sort: 'studentName',
        direction: 'asc',
      });
      const pages = await Promise.all(
        Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, index) =>
          getAdminStudents({
            q,
            schoolId: filterSchoolId || undefined,
            archive: 'active',
            pageSize: 100,
            page: index + 2,
            sort: 'studentName',
            direction: 'asc',
          }),
        ),
      );
      const rows = [...first.students, ...pages.flatMap((page) => page.students)];
      setChoices((current) => [...new Map([...current, ...rows].map((s) => [s.id, s])).values()]);
      return rows.map(studentOption);
    },
    [filterSchoolId, studentOption],
  );
  async function create(data: FormData) {
    if (!school) return;
    const selectedOpeningTime = school.openingTime;
    const selectedClosingTime = school.closingTime;
    const special = school.schoolType === 'SPECIAL';
    await perform(
      () =>
        createAdminTransportRoute({
          title: String(data.get('title')),
          driverId: String(data.get('driverId')),
          schoolId: school.id,
          academicYear: String(data.get('academicYear')),
          direction,
          scheduledStartTime:
            direction === 'FROM_SCHOOL' ? selectedClosingTime : selectedOpeningTime,
          scheduledArrivalTime:
            direction === 'TO_SCHOOL' ? selectedOpeningTime : selectedClosingTime,
          ...(special
            ? {}
            : {
                contractPriceRials: tomanToRials(String(data.get('contractPriceTomans'))),
                contractDate: normalizeDigits(String(data.get('contractDate'))),
              }),
          activeWeekdays: [0, 1, 2, 3, 4],
        }),
      special ? 'مسیر استثنائی بدون قرارداد ایجاد شد.' : 'مسیر ایجاد شد.',
    );
  }
  async function add() {
    if (!route || !studentId) return;
    const student = choices.find((item) => item.id === studentId);
    await perform(
      () => addStudentToAdminRoute(route.id, { studentId, pickupOrder: route.students.length + 1 }),
      student?.companion
        ? 'دانش‌آموز و همراه او به مسیر افزوده شدند.'
        : 'دانش‌آموز به مسیر افزوده شد.',
    );
  }
  return (
    <Card className="space-y-8">
      <section>
        <h2 className="text-lg font-black">تعریف مسیر و تخصیص دانش‌آموز</h2>
        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-danger bg-danger-soft p-3 text-sm font-bold text-danger"
          >
            {errorMessage}
          </p>
        )}
        <p className="mt-2 text-sm leading-7 text-muted">
          فیلتر مدرسه فقط جست‌وجوی دانش‌آموز را آسان می‌کند؛ یک مسیر می‌تواند دانش‌آموزان چند
          مدرسه را داشته باشد.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create(new FormData(e.currentTarget));
          }}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field label="عنوان مسیر">
            <Input name="title" required minLength={2} />
          </Field>
          <Field
            label="راننده"
            hint="ظرفیت خودرو فقط هشدار است؛ ثبت مسیر و تخصیص دانش‌آموز بیش از ظرفیت مجاز است."
          >
            <Picker
              name="driverId"
              options={drivers
                .filter((d) => d.status === 'ACTIVE')
                .sort(
                  (a, b) =>
                    a.lastName.localeCompare(b.lastName, 'fa') ||
                    a.firstName.localeCompare(b.firstName, 'fa'),
                )
                .map((d) => ({
                  value: d.id,
                  label: `${d.firstName} ${d.lastName} · ظرفیت ${d.capacity ?? 0}`,
                }))}
            />
          </Field>
          <Field label="مدرسه مبنا">
            <Picker
              value={schoolId}
              onChange={setSchoolId}
              options={schools
                .filter((s) => s.isActive)
                .map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
          <Field label="جهت" hint="رفت و برگشت هر دو جهت را در یک مسیر پوشش می‌دهد.">
            <Picker
              name="direction"
              value={direction}
              onChange={(value) => setDirection(value as AdminTransportRoute['direction'])}
              options={[
                { value: 'TO_SCHOOL', label: 'رفت' },
                { value: 'FROM_SCHOOL', label: 'برگشت' },
                { value: 'ROUND_TRIP', label: 'رفت و برگشت' },
              ]}
            />
          </Field>
          <Field label="سال تحصیلی">
            <Input name="academicYear" defaultValue="1405-1406" required />
          </Field>
          {school?.schoolType === 'SPECIAL' ? (
            <div className="self-end rounded-xl bg-primary-soft p-3 text-sm font-bold text-primary">
              مسیر مدرسه استثنائی بدون مبلغ و قرارداد ثبت می‌شود.
            </div>
          ) : (
            <>
              <Field label="مبلغ قرارداد ماهانه مسیر (تومان)">
                <RoutePriceInput />
              </Field>
              <div>
                <JalaliDateInput
                  label="تاریخ قرارداد (شمسی)"
                  value={contractDateIso}
                  onChange={setContractDateIso}
                  required
                />
                <input type="hidden" name="contractDate" value={isoToJalaliDate(contractDateIso)} />
              </div>
            </>
          )}
          <Button className="self-end" loading={busy} disabled={busy || !school}>
            ایجاد مسیر
          </Button>
        </form>
      </section>
      <section className="border-t border-border pt-7">
        <h3 className="font-black">مدیریت دانش‌آموزان مسیر</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="مسیر">
            <Picker
              value={routeId}
              onChange={setRouteId}
              options={routes.map((r) => ({
                value: r.id,
                label: [
                  r.title,
                  r.school.name,
                  r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : null,
                ]
                  .filter(Boolean)
                  .join(' · '),
              }))}
            />
          </Field>
          <Field label="فیلتر مدرسه دانش‌آموز">
            <Picker
              value={filterSchoolId}
              onChange={(v) => {
                setFilterSchoolId(v);
                setStudentId('');
              }}
              required={false}
              options={schools.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Field>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <SearchPicker
            label="دانش‌آموز"
            loadOptions={searchStudents}
            value={studentId}
            onChange={setStudentId}
            options={visibleStudents.map(studentOption)}
          />
          <p className="text-xs text-muted md:col-span-2">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900">
              رفت
            </span>{' '}
            ثبت‌شده در مسیر رفت ·{' '}
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
              برگشت
            </span>{' '}
            ثبت‌شده در مسیر برگشت · بدون نشان: هنوز تخصیص داده نشده
          </p>
          <Button className="self-end" disabled={busy || !route || !studentId} loading={busy}>
            افزودن به مسیر
          </Button>
        </form>
        {route &&
          studentId &&
          (() => {
            const selected = choices.find((item) => item.id === studentId);
            const occupied = route.students.reduce((sum, item) => sum + (item.seatCount ?? 1), 0);
            const capacity = route.driver?.capacity ?? 0;
            const next = occupied + (selected?.companion ? 2 : 1);
            return capacity > 0 && next > capacity ? (
              <p
                className="mt-3 rounded-xl bg-warning-soft p-3 text-sm font-bold text-warning"
                role="note"
              >
                با این تخصیص، ظرفیت {capacity} نفره خودرو رد می‌شود ({next} صندلی). ثبت همچنان مجاز
                است.
              </p>
            ) : null;
          })()}
        {route?.students.length ? (
          <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
            {[...route.students]
              .sort((a, b) => a.pickupOrder - b.pickupOrder)
              .map((student) => (
                <li
                  key={student.id}
                  className="flex min-h-14 items-center justify-between gap-3 px-4"
                >
                  <span className="text-sm font-bold">
                    {student.pickupOrder}. {student.firstName} {student.lastName}
                    {student.companion && (
                      <small className="mr-2 rounded-full bg-warning-soft px-2 py-1 text-warning">
                        همراه: {student.companion.firstName} {student.companion.lastName} · ۲ صندلی
                      </small>
                    )}
                    <small className="mt-1 block font-normal leading-5 text-muted">
                      آدرس: {student.address || 'ثبت نشده است'}
                    </small>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void perform(
                        () => removeStudentFromAdminRoute(route.id, student.id),
                        'ارتباط دانش‌آموز و همراه او با مسیر حذف شد.',
                      )
                    }
                  >
                    حذف از مسیر
                  </Button>
                </li>
              ))}
          </ul>
        ) : null}
      </section>
      <RouteCatalog
        routes={routes}
        onEdit={(id, body) => perform(() => updateAdminTransportRoute(id, body), 'مسیر ویرایش شد.')}
        onArchive={(id) => perform(() => archiveAdminRoute(id), 'مسیر غیرفعال شد.')}
        busy={busy}
      />
      {message && (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm font-bold">
          {message}
        </p>
      )}
    </Card>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold">
        {label}
        <span className="mt-2 block">{children}</span>
      </label>
      {hint && <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}
function Picker({
  name,
  value,
  onChange,
  options,
  required = true,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      required={required}
      className="min-h-12 w-full rounded-xl border border-border bg-white px-3"
    >
      <option value="">{required ? 'انتخاب کنید' : 'همه مدارس'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
