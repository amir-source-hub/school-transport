import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Alert } from '@/components/feedback/alert';

export const metadata: Metadata = { title: 'تماس با ما' };

export default function ContactPage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="پشتیبانی"
        title="برای دریافت راهنمایی با پشتیبانی در ارتباط باشید"
        description="راه‌های ارتباطی رسمی پس از تأیید اطلاعات خدمت در این صفحه نمایش داده خواهند شد."
      />
      <PageContainer className="py-14">
        <div className="mx-auto max-w-2xl">
          <Alert title="اطلاعات تماس هنوز ثبت نشده است">
            اسناد پروژه شماره تماس، ایمیل یا نشانی تأییدشده‌ای ارائه نمی‌کنند؛ بنابراین برای جلوگیری
            از نمایش اطلاعات فرضی، این بخش پس از تأیید اطلاعات رسمی تکمیل می‌شود.
          </Alert>
        </div>
      </PageContainer>
    </>
  );
}
