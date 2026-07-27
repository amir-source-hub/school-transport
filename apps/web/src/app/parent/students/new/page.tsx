import { redirect } from 'next/navigation';

export default function NewStudentPage() {
  redirect('/parent/enrollments');
}
