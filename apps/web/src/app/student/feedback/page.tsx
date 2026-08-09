import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { FeedbackForm } from '@/features/feedback/feedback-form';
import { FeedbackList } from '@/features/feedback/feedback-list';
import { getMyFeedback } from '@/features/feedback/feedback-api';
export const metadata = { title: 'انتقادات و پیشنهادات' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const items = await getMyFeedback();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل دانش‌آموز', href: '/student/dashboard' },
          { label: 'انتقادات و پیشنهادات' },
        ]}
      />
      <h1 className="text-2xl font-black">انتقادات و پیشنهادات</h1>
      <Card>
        <FeedbackForm />
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-black">پیام‌های من</h2>
        <FeedbackList items={items} />
      </section>
    </div>
  );
}
