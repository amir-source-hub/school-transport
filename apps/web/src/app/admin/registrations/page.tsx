import { Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Pagination } from '@/components/navigation/pagination';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AutoSubmitForm } from '@/components/forms/auto-submit-form';
import { getAdminRegistrations, getRegistrationTone, registrationStatuses } from '@/features/admin-registrations/admin-registrations-api';

export const metadata = { title: 'درخواست‌های ثبت‌نام' };

type SearchParams = Promise<{ q?: string; status?: string; sort?: string; page?: string }>;

export default async function RegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const status = registrationStatuses.includes(params.status as (typeof registrationStatuses)[number]) ? params.status! : 'همه';
  const sort = params.sort === 'student' ? 'student' : 'tracking';
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const { registrations } = await getAdminRegistrations();

  const filtered = registrations
    .filter((item) => status === 'همه' || item.status === status || item.status.startsWith(`${status} (`))
    .filter((item) => !query || `${item.trackingCode} ${item.studentName} ${item.familyName} ${item.schoolName}`.includes(query))
    .toSorted((a, b) => sort === 'student' ? a.studentName.localeCompare(b.studentName, 'fa') : a.trackingCode.localeCompare(b.trackingCode, 'fa'));

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageHref = (page: number) => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (status !== 'همه') next.set('status', status);
    if (sort !== 'tracking') next.set('sort', sort);
    next.set('page', String(page));
    return `/admin/registrations?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'درخواست‌های ثبت‌نام' }]} />
      <div>
        <p className="text-sm font-bold text-primary">صف بررسی مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">درخواست‌های ثبت‌نام</h1>
      </div>
      <Card>
        <AutoSubmitForm method="get" className="grid gap-4 md:grid-cols-[1fr_13rem_13rem] md:items-end">
          <label className="text-sm font-bold">
            جست‌وجو
            <span className="relative mt-2 block">
              <Search aria-hidden="true" className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input type="search" name="q" defaultValue={query} placeholder="کد، دانش‌آموز، خانواده یا مدرسه" className="pe-10" />
            </span>
          </label>
          <label className="text-sm font-bold">
            وضعیت
            <select name="status" defaultValue={status} className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm">
              {registrationStatuses.map((option) => (<option key={option}>{option}</option>))}
            </select>
          </label>
          <label className="text-sm font-bold">
            مرتب‌سازی
            <select name="sort" defaultValue={sort} className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm">
              <option value="tracking">کد پیگیری</option>
              <option value="student">نام دانش‌آموز</option>
            </select>
          </label>
        </AutoSubmitForm>
      </Card>

      {visible.length === 0 ? (
        <Card><p className="font-black">نتیجه‌ای پیدا نشد</p><p className="mt-2 text-sm text-muted">عبارت یا وضعیت دیگری را امتحان کنید.</p></Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {visible.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black">{item.studentName}</p><p className="mt-1 text-sm text-muted" dir="ltr">{item.trackingCode}</p></div>
                  <Badge tone={getRegistrationTone(item.status)}>{item.status}</Badge>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div><dt className="text-muted">خانواده</dt><dd className="font-bold">{item.familyName}</dd></div>
                  <div><dt className="text-muted">اقدام بعدی</dt><dd className="font-bold">{item.nextAction}</dd></div>
                </dl>
                <ButtonLink href={`/admin/registrations/${item.id}`} className="mt-4 w-full">مشاهده جزئیات و اقدامات</ButtonLink>
              </Card>
            ))}
          </div>
          <Card className="hidden md:block">
            <div className="overflow-x-auto" role="region" aria-label="جدول درخواست‌های ثبت‌نام" tabIndex={0}>
              <table className="w-full min-w-[48rem] text-right text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-3 py-3">کد پیگیری</th>
                    <th className="px-3 py-3">دانش‌آموز</th>
                    <th className="px-3 py-3">خانواده</th>
                    <th className="px-3 py-3">وضعیت</th>
                    <th className="px-3 py-3">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-bold" dir="ltr">{item.trackingCode}</td>
                      <td className="px-3 py-3">{item.studentName}</td>
                      <td className="px-3 py-3">{item.familyName}</td>
                      <td className="px-3 py-3"><Badge tone={getRegistrationTone(item.status)}>{item.status}</Badge></td>
                      <td className="px-3 py-3"><ButtonLink href={`/admin/registrations/${item.id}`} size="sm">جزئیات و اقدامات</ButtonLink></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination currentPage={currentPage} totalPages={totalPages} getHref={getPageHref} />
        </>
      )}
    </div>
  );
}
