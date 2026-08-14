import Link from 'next/link';
import { Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getManagerStudents } from '@/features/manager/manager-api';
export const metadata = { title: 'دانش‌آموزان' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') p.set(k, v);
  if (!p.has('page')) p.set('page', '1');
  if (!p.has('pageSize')) p.set('pageSize', '20');
  const { items, total } = await getManagerStudents(p.toString());
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'دانش‌آموزان' }]}
      />
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">دانش‌آموزان مدرسه</h1>
        <p className="mt-2 text-sm text-muted">
          {total.toLocaleString('fa-IR')} دانش‌آموز در محدوده دسترسی شما
        </p>
      </header>
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <span className="sr-only">جست‌وجو</span>
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              name="query"
              defaultValue={typeof raw.query === 'string' ? raw.query : ''}
              placeholder="نام، کد دانش‌آموز یا کد ملی"
              className="pe-10"
            />
          </label>
          <select
            name="photoStatus"
            aria-label="وضعیت عکس دانش‌آموز"
            defaultValue={typeof raw.photoStatus === 'string' ? raw.photoStatus : 'all'}
            className="min-h-12 rounded-xl border border-border bg-white px-3"
          >
            <option value="all">همه عکس‌ها</option>
            <option value="with_photo">دارای عکس</option>
            <option value="without_photo">بدون عکس</option>
          </select>
          <Button>اعمال فیلتر</Button>
        </form>
      </Card>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            {raw.query
              ? 'نتیجه‌ای برای فیلترهای انتخاب‌شده پیدا نشد.'
              : 'هنوز دانش‌آموزی در این مدرسه ثبت نشده است.'}
          </p>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-white md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">فهرست دانش‌آموزان مدرسه</caption>
              <thead className="bg-surface-muted text-right">
                <tr>
                  <th className="p-4">دانش‌آموز</th>
                  <th className="p-4">مقطع و پایه</th>
                  <th className="p-4">سرپرست</th>
                  <th className="p-4">کد ملی</th>
                  <th className="p-4">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((x) => (
                  <tr key={x.id} className="hover:bg-primary-soft/40">
                    <td className="p-4">
                      <Link className="font-black text-primary" href={`/manager/students/${x.id}`}>
                        {x.firstName} {x.lastName}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {x.studentCode ?? 'بدون کد دانش‌آموزی'}
                      </p>
                    </td>
                    <td className="p-4">
                      {x.educationLevel ?? '—'}، پایه {x.grade ?? '—'}
                    </td>
                    <td className="p-4">{x.guardianName ?? '—'}</td>
                    <td className="p-4 font-mono">{x.nationalIdMasked ?? '—'}</td>
                    <td className="p-4">
                      <Badge tone={x.isActive ? 'success' : 'neutral'}>
                        {x.isActive ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {items.map((x) => (
              <Card key={x.id}>
                <div className="flex justify-between gap-3">
                  <Link className="font-black text-primary" href={`/manager/students/${x.id}`}>
                    {x.firstName} {x.lastName}
                  </Link>
                  <Badge tone={x.isActive ? 'success' : 'neutral'}>
                    {x.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">مقطع و پایه</dt>
                    <dd className="font-bold">
                      {x.educationLevel ?? '—'}، {x.grade ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">سرپرست</dt>
                    <dd className="font-bold">{x.guardianName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">کد ملی</dt>
                    <dd className="font-mono">{x.nationalIdMasked ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">عکس</dt>
                    <dd>{x.hasApprovedPhoto ? 'تأییدشده' : 'ثبت‌نشده'}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
