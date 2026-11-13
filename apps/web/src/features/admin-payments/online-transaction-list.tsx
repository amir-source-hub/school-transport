import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { formatIrr, formatJalaliDate, formatJalaliDateTime } from '@/lib/formatters';
import type { AdminOnlineTransactionList } from './admin-payments-api';
import { PersistentQueryForm } from '@/components/navigation/persistent-query-form';

export function OnlineTransactionList({ data, filters }: {
  data: AdminOnlineTransactionList;
  filters: { q?: string; status?: string; itemType?: string; routeId?: string; driverId?: string };
}) {
  const queryFor = (page: number) => new URLSearchParams({ view: 'online',
    ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { onlineStatus: filters.status } : {}),
    ...(filters.itemType ? { itemType: filters.itemType } : {}),
    ...(filters.routeId ? { routeId: filters.routeId } : {}),
    ...(filters.driverId ? { driverId: filters.driverId } : {}), onlinePage: String(page) }).toString();
  return <section className="space-y-4" aria-labelledby="online-payments-heading">
    <div>
      <h2 id="online-payments-heading" className="text-xl font-black">تراکنش‌های آنلاین</h2>
      <p className="mt-1 text-sm text-muted">{data.total.toLocaleString('fa-IR')} تراکنش مطابق پالایش فعلی</p>
    </div>
    <Card><PersistentQueryForm path="/admin/payments" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" ariaLabel="پالایش تراکنش‌های آنلاین">
      <input type="hidden" name="view" value="online" />
      {filters.routeId && <input type="hidden" name="routeId" value={filters.routeId} />}
      {filters.driverId && <input type="hidden" name="driverId" value={filters.driverId} />}
      <label className="text-sm font-bold">جست‌وجو
        <input name="q" defaultValue={filters.q ?? ''} placeholder="نام دانش‌آموز، کد ملی یا شماره مرجع" className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3" />
      </label>
      <label className="text-sm font-bold">وضعیت
        <select name="onlineStatus" defaultValue={filters.status ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3">
          <option value="">همه وضعیت‌ها</option><option value="SUCCEEDED">موفق</option><option value="PENDING">در انتظار تأیید</option><option value="FAILED">ناموفق</option>
        </select>
      </label>
      <label className="text-sm font-bold">نوع پرداخت
        <select name="itemType" defaultValue={filters.itemType ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3">
          <option value="">همه</option><option value="PREPAYMENT">پیش‌پرداخت</option><option value="INSTALLMENT">قسط</option>
        </select>
      </label>
      <div className="flex items-end gap-2"><button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white">اعمال</button>
        <Link href="/admin/payments?view=online" className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm font-bold">پاک‌کردن</Link>
      </div>
    </PersistentQueryForm></Card>
    {data.items.length === 0 ? <Card><p className="text-center text-sm text-muted">تراکنشی مطابق این پالایش وجود ندارد.</p></Card> : data.items.map((item) =>
      <Card key={item.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-black">{item.studentName}</h3><p className="mt-1 text-sm text-muted">خانواده {item.familyName} · {item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber.toLocaleString('fa-IR')}`}</p></div>
          <Badge tone={item.status === 'SUCCEEDED' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'}>
            {item.status === 'SUCCEEDED' ? 'پرداخت موفق' : item.status === 'FAILED' ? 'پرداخت ناموفق' : 'در انتظار تأیید'}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted">مبلغ این تراکنش</dt><dd className="font-bold">{formatIrr(item.amount)}</dd></div>
          <div><dt className="text-muted">زمان پرداخت</dt><dd className="font-bold">{item.verifiedAt ? formatJalaliDateTime(item.verifiedAt) : 'هنوز تأیید نشده'}</dd></div>
          <div><dt className="text-muted">شماره مرجع</dt><dd className="font-bold" dir="ltr">{item.reference ?? '—'}</dd></div>
          <div><dt className="text-muted">زمان درخواست</dt><dd className="font-bold">{formatJalaliDateTime(item.requestedAt)}</dd></div>
          <div><dt className="text-muted">پرداخت‌شده از کل</dt><dd className="font-bold">{formatIrr(item.paidAmount)} از {formatIrr(item.planTotal)}</dd></div>
          <div><dt className="text-muted">مانده</dt><dd className="font-bold">{formatIrr(item.remainingAmount)}</dd></div>
          <div><dt className="text-muted">اقساط پرداخت‌شده / باقی‌مانده</dt><dd className="font-bold">{item.paidCount.toLocaleString('fa-IR')} / {item.remainingCount.toLocaleString('fa-IR')}</dd></div>
          <div><dt className="text-muted">پیش‌پرداخت</dt><dd className="font-bold">{item.prepaymentPaid ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</dd></div>
          <div><dt className="text-muted">سررسید بعدی</dt><dd className="font-bold">{item.nextDueDate ? formatJalaliDate(item.nextDueDate) : 'تعیین نشده'}</dd></div>
        </dl>
      </Card>)}
    <nav aria-label="صفحه‌بندی تراکنش‌های آنلاین" className="flex items-center justify-between gap-3">
      {data.page > 1 ? <ButtonLink variant="secondary" href={`/admin/payments?${queryFor(data.page - 1)}`}>قبلی</ButtonLink> : <span />}
      <span className="text-xs text-muted">صفحه {data.page.toLocaleString('fa-IR')}</span>
      {data.page * data.pageSize < data.total ? <ButtonLink variant="secondary" href={`/admin/payments?${queryFor(data.page + 1)}`}>بعدی</ButtonLink> : <span />}
    </nav>
  </section>;
}
