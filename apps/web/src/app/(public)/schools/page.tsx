import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Alert } from '@/components/feedback/alert';
import { Card } from '@/components/ui/card';
import { getSchools } from '@/features/schools/schools-api';

export const metadata: Metadata = { title: 'مدارس' };

export default async function SchoolsPage() {
  const { schools, source } = await getSchools();

  return (
    <>
      <PublicPageIntro
        eyebrow="مدارس تحت پوشش"
        title="انتخاب مدرسه از فهرست تأییدشده سامانه"
        description="اطلاعات مدرسه یکی از بخش‌های عملیاتی درخواست هر دانش‌آموز است و فهرست آن باید از داده‌های تأییدشده سامانه دریافت شود."
      />
      <PageContainer className="py-14">
        {source === 'mock' && (
          <Alert tone="warning" title="حالت توسعه آفلاین">
            ارتباط با سرویس مدارس برقرار نشد؛ فهرست زیر داده نمایشی است و برای تصمیم‌گیری عملیاتی
            قابل استفاده نیست.
          </Alert>
        )}
        {schools.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <Alert title="هنوز مدرسه فعالی ثبت نشده است">
              پس از فعال‌شدن مدرسه‌ها در سامانه، فهرست آن‌ها در همین صفحه نمایش داده می‌شود.
            </Alert>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 md:grid-cols-2" aria-label="مدارس فعال">
            {schools.map((school) => (
              <li key={school.id}>
                <Card className="h-full">
                  <h2 className="text-lg font-black">{school.name}</h2>
                  <p className="mt-2 text-sm text-muted">
                    {school.province}، {school.city}
                    {school.district ? `، ${school.district}` : ''}
                  </p>
                  <p className="mt-3 text-sm">{school.address}</p>
                  {school.phoneNumber && (
                    <a
                      className="mt-4 inline-block text-sm font-bold text-primary underline-offset-4 hover:underline"
                      href={`tel:${school.phoneNumber}`}
                      dir="ltr"
                    >
                      {school.phoneNumber}
                    </a>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </>
  );
}
