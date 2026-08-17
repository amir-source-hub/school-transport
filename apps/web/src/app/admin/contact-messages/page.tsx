import { redirect } from 'next/navigation';

export const metadata = { title: 'پیام‌های تماس' };
export const dynamic = 'force-dynamic';

export default async function ContactMessagesPage() {
  redirect('/admin/feedback');
}
