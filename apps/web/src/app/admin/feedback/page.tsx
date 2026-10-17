import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { AdminFeedbackList } from '@/features/feedback/admin-feedback-list';
import { getAdminFeedback, getPublicContactMessages } from '@/features/feedback/feedback-api';
import { FilteredCount } from '@/components/data/filtered-count';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatJalaliDateTime } from '@/lib/formatters';
export const metadata = { title: 'پیام‌ها و بازخوردها' };
export const dynamic = 'force-dynamic';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const status = ['NEW', 'READ', 'ESCALATED', 'ANSWERED', 'CLOSED'].includes(params.status ?? '')
    ? params.status
    : undefined;
  const [allFeedback, contactMessages] = await Promise.all([
    getAdminFeedback({ q: q || undefined, status }),
    getPublicContactMessages(q || undefined),
  ]);
  const items = allFeedback.filter((item) => item.senderType !== 'PUBLIC');
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'پیام‌ها و بازخوردها' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black">پیام‌ها و بازخوردها</h1><FilteredCount count={items.length + contactMessages.length} label="پیام مطابق فیلتر"/></div>
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end">
          <label className="text-sm font-bold">
            جست‌وجو در نام و متن پیام
            <Input
              className="mt-2"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="نام، عنوان، متن یا پاسخ"
            />
          </label>
          <label className="text-sm font-bold">
            وضعیت
            <select
              name="status"
              defaultValue={status ?? ''}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3"
            >
              <option value="">همه، از جمله پاسخ‌داده‌شده</option>
              <option value="NEW">جدید</option>
              <option value="READ">خوانده‌شده</option>
              <option value="ESCALATED">فوری</option>
              <option value="ANSWERED">پاسخ‌داده‌شده</option>
              <option value="CLOSED">بسته‌شده</option>
            </select>
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white"
          >
            جست‌وجو
          </button>
        </form>
      </Card>
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-black">بازخورد کاربران و مدیران</h2>
          <p className="text-sm text-muted">این پیام‌ها قابل پاسخ‌گویی هستند.</p>
        </div>
        <AdminFeedbackList items={items} />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-black">پیام‌های تماس با ما</h2>
          <p className="text-sm text-muted">پیام‌های عمومی فقط خواندنی هستند.</p>
        </div>
        {contactMessages.length === 0 ? (
          <p className="rounded-2xl border border-border p-5 text-muted">
            هنوز پیامی ثبت نشده است.
          </p>
        ) : (
          contactMessages.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-black">
                  {item.contactName ?? 'کاربر سایت'} — {item.subject}
                </h3>
                <time className="text-xs text-muted">
                  {formatJalaliDateTime(item.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-sm text-muted">
                شماره تماس:{' '}
                <strong dir="ltr" className="text-foreground">
                  {item.contactPhone ?? 'ثبت نشده'}
                </strong>
              </p>
              <p className="mt-3 whitespace-pre-wrap leading-8">{item.message}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
