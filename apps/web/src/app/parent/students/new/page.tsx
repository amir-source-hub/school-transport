import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { getSchools } from '@/features/schools/schools-api';
import { StudentForm } from '@/features/students/student-form';

export const metadata = { title: 'افزودن دانش‌آموز' };
export const dynamic = 'force-dynamic';

export default async function NewStudentPage() {
  const { schools } = await getSchools();
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'دانش‌آموزان', href: '/parent/students' }, { label: 'افزودن' }]} />
      <div><p className="text-sm font-bold text-primary">دانش‌آموز جدید</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">افزودن دانش‌آموز</h1></div>
      <Card><StudentForm schools={schools.map(({ id, name }) => ({ id, name }))} /></Card>
    </div>
  );
}
