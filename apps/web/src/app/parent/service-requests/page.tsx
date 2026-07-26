import { redirect } from 'next/navigation';

export const metadata = { title: 'درخواست خدمت' };

export default function ServiceRequestsPage() {
  redirect('/parent/enrollments');
}
