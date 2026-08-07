import { redirect } from 'next/navigation';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/student/students/new');

export default function NewStudentPage() {
  redirect('/student/enrollments');
}
