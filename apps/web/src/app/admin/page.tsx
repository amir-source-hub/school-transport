import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/admin');

export default function AdminPage() {
  redirect('/admin/dashboard');
}
