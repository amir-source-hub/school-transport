import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'تماس با ما' };

export default function ContactPage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="پشتیبانی"
        title="برای دریافت راهنمایی با پشتیبانی در ارتباط باشید"
        description="تیم پشتیبانی سامانه سرویس مدرسه آماده پاسخگویی به سوالات شماست."
      />
      <PageContainer className="py-14">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          <Card variant="raised" padding="lg">
            <p className="text-sm font-bold text-primary">تماس تلفنی</p>
            <p className="mt-3 text-2xl font-black" dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</p>
            <p className="mt-2 text-sm text-muted">شنبه تا چهارشنبه ۸:۰۰ تا ۱۸:۰۰</p>
          </Card>
          <Card variant="raised" padding="lg">
            <p className="text-sm font-bold text-primary">ایمیل</p>
            <p className="mt-3 font-black" dir="ltr">support@schooltransport.ir</p>
            <p className="mt-2 text-sm text-muted">پاسخگویی ظرف ۲۴ ساعت کاری</p>
          </Card>
          <Card variant="raised" padding="lg" className="sm:col-span-2">
            <p className="text-sm font-bold text-primary">نشانی</p>
            <p className="mt-3 font-black">تهران، خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۲۳۴</p>
            <p className="mt-2 text-sm text-muted">سامانه سرویس مدرسه — واحد پشتیبانی</p>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
