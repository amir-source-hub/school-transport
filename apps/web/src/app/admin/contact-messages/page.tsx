import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { getPublicContactMessages } from '@/features/feedback/feedback-api';

export const metadata = { title: 'پیام‌های تماس' };
export const dynamic = 'force-dynamic';

export default async function ContactMessagesPage() {
  const items = await getPublicContactMessages();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'پیام‌های تماس' }]}
      />
      <div>
        <h1 className="text-2xl font-black">پیام‌های تماس</h1>
        <p className="mt-1 text-sm text-muted">پیام‌های ثبت‌شده از فرم تماس با ما (فقط خواندنی)</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted">
          هنوز پیامی ثبت نشده است.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">{item.contactName ?? 'کاربر سایت'}</h2>
                  <p className="mt-1 text-sm font-bold text-primary">{item.subject}</p>
                </div>
                <time className="text-xs text-muted" dateTime={item.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat('fa-IR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(item.createdAt)}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-foreground">{item.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
