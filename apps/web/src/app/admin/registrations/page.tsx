import { Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Pagination } from '@/components/navigation/pagination';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AutoSubmitForm } from '@/components/forms/auto-submit-form';
import {
  getAdminRegistrations,
  getRegistrationTone,
  registrationStatusGroups,
} from '@/features/admin-registrations/admin-registrations-api';

export const metadata = { title: 'درخواست‌های ثبت‌نام' };

const PAGE_SIZE = 5;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  sort?: string;
  direction?: string;
  page?: string;
}>;

export default async function RegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const status = registrationStatusGroups.some((group) => group.value === params.status)
    ? params.status!
    : 'all';
  const sort = ['studentName', 'schoolName', 'createdAt'].includes(params.sort ?? '')
    ? (params.sort as 'studentName' | 'schoolName' | 'createdAt')
    : 'createdAt';
  const direction = params.direction === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const { registrations, pagination } = await getAdminRegistrations({
    q: query || undefined,
    status,
    sort,
    direction,
    page,
    pageSize: PAGE_SIZE,
  });

  const getPageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (status !== 'all') next.set('status', status);
    if (sort !== 'createdAt') next.set('sort', sort);
    if (direction !== 'desc') next.set('direction', direction);
    next.set('page', String(nextPage));
    return `/admin/registrations?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'درخواست‌های ثبت‌نام' },
        ]}
      />
      <div>
        <p className="text-sm font-bold text-primary">صف بررسی مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">درخواست‌های ثبت‌نام</h1>
      </div>
      <Card>
        <AutoSubmitForm
          method="get"
          className="grid gap-4 md:grid-cols-[1fr_13rem_13rem] md:items-end"
        >
          <label className="text-sm font-bold">
            جست‌وجو
            <span className="relative mt-2 block">
              <Search
                aria-hidden="true"
                className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="کد، دانش‌آموز، خانواده یا مدرسه"
                className="pe-10"
              />
            </span>
          </label>
          <label className="text-sm font-bold">
            وضعیت
            <select
              name="status"
              defaultValue={status}
              className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            >
              {registrationStatusGroups.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            مرتب‌سازی
            <select
              name="sort"
              defaultValue={sort}
              className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            >
              <option value="createdAt">جدیدترین</option>
              <option value="studentName">نام دانش‌آموز</option>
              <option value="schoolName">مدرسه</option>
            </select>
          </label>
        </AutoSubmitForm>
      </Card>

      {registrations.length === 0 ? (
        <Card>
          <p className="font-black">نتیجه‌ای پیدا نشد</p>
          <p className="mt-2 text-sm text-muted">عبارت یا وضعیت دیگری را امتحان کنید.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {registrations.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{item.studentName}</p>
                    <p className="mt-1 text-sm text-muted" dir="ltr">
                      {item.trackingCode}
                    </p>
                  </div>
                  <Badge tone={getRegistrationTone(item.status)}>{item.status}</Badge>
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted">خانواده</dt>
                    <dd className="font-bold">{item.familyName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">اقدام بعدی</dt>
                    <dd className="font-bold">{item.nextAction}</dd>
                  </div>
                </dl>
                <ButtonLink href={`/admin/registrations/${item.id}`} className="mt-4 w-full">
                  مشاهده جزئیات و اقدامات
                </ButtonLink>
              </Card>
            ))}
          </div>
          <Card className="hidden md:block">
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="جدول درخواست‌های ثبت‌نام"
              tabIndex={0}
            >
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
                  {registrations.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-bold" dir="ltr">
                        {item.trackingCode}
                      </td>
                      <td className="px-3 py-3">{item.studentName}</td>
                      <td className="px-3 py-3">{item.familyName}</td>
                      <td className="px-3 py-3">
                        <Badge tone={getRegistrationTone(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <ButtonLink href={`/admin/registrations/${item.id}`} size="sm">
                          جزئیات و اقدامات
                        </ButtonLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            getHref={getPageHref}
          />
        </>
      )}
    </div>
  );
}
