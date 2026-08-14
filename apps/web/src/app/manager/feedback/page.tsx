import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { FeedbackForm } from '@/features/feedback/feedback-form';
import { FeedbackList } from '@/features/feedback/feedback-list';
import { getManagerFeedback } from '@/features/feedback/feedback-api';
export const metadata = { title: 'انتقادات و پیشنهادات' };
export default async function Page() {
  const items = await getManagerFeedback();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'انتقادات و پیشنهادات' },
        ]}
      />
      <header>
        <h1 className="text-2xl font-black">انتقادات و پیشنهادات</h1>
        <p className="mt-2 text-sm text-muted">
          پیام‌ها فقط در حساب شما و صف مدیریت سامانه نمایش داده می‌شوند.
        </p>
      </header>
      <Card>
        <FeedbackForm audience="manager" />
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-black">پیام‌های من</h2>
        <FeedbackList items={items} />
      </section>
    </div>
  );
}
