import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { AdminFeedbackList } from '@/features/feedback/admin-feedback-list';
import { getAdminFeedback } from '@/features/feedback/feedback-api';
export const metadata = { title: 'انتقادات و پیشنهادات' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const items = await getAdminFeedback();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'انتقادات و پیشنهادات' },
        ]}
      />
      <h1 className="text-2xl font-black">انتقادات و پیشنهادات</h1>
      <AdminFeedbackList items={items} />
    </div>
  );
}
