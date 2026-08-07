import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/student');

export default function StudentPage() {
  redirect('/student/dashboard');
}
