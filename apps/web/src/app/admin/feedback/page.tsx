import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { AdminFeedbackList } from '@/features/feedback/admin-feedback-list';
import { getAdminFeedback, getPublicContactMessages } from '@/features/feedback/feedback-api';
export const metadata = { title: 'پیام‌ها و بازخوردها' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [allFeedback, contactMessages] = await Promise.all([
    getAdminFeedback(),
    getPublicContactMessages(),
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
      <h1 className="text-2xl font-black">پیام‌ها و بازخوردها</h1>
      <section className="space-y-3">
        <div><h2 className="text-xl font-black">بازخورد کاربران و مدیران</h2><p className="text-sm text-muted">این پیام‌ها قابل پاسخ‌گویی هستند.</p></div>
        <AdminFeedbackList items={items} />
      </section>
      <section className="space-y-3">
        <div><h2 className="text-xl font-black">پیام‌های تماس با ما</h2><p className="text-sm text-muted">پیام‌های عمومی فقط خواندنی هستند.</p></div>
        {contactMessages.length === 0 ? <p className="rounded-2xl border border-border p-5 text-muted">هنوز پیامی ثبت نشده است.</p> : contactMessages.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2"><h3 className="font-black">{item.contactName ?? 'کاربر سایت'} — {item.subject}</h3><time className="text-xs text-muted">{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(item.createdAt)}</time></div>
            <p className="mt-3 whitespace-pre-wrap leading-8">{item.message}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
