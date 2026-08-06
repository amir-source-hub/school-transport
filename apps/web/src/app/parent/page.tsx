import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/parent');

export default function ParentPage() {
  redirect('/parent/dashboard');
}
