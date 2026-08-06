import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/parent/students/new');

export default function NewStudentPage() {
  redirect('/parent/enrollments');
}
