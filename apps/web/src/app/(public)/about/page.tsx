import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'درباره سامانه' };

export default function AboutPage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="درباره خدمت"
        title="یک مسیر یکپارچه برای خانواده و مدیریت مدرسه"
        description="این سامانه برای ثبت و پیگیری خدمات سرویس مدرسه، از درخواست اولیه تا قرارداد و پرداخت، طراحی شده است."
      />
      <PageContainer className="py-14 sm:py-18">
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <h2 className="text-lg font-black">شفاف برای خانواده</h2>
            <p className="mt-2 text-sm text-muted">
              هر خانواده می‌تواند دانش‌آموزان خود را در یک حساب مدیریت کند و وضعیت هر دانش‌آموز را
              جداگانه ببیند.
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-black">ساختارمند برای مدیریت</h2>
            <p className="mt-2 text-sm text-muted">
              بررسی درخواست، تعیین قیمت، قرارداد و پرداخت‌ها در فرایندی مشخص و قابل پیگیری انجام
              می‌شود.
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-black">متمرکز بر اعتماد</h2>
            <p className="mt-2 text-sm text-muted">
              وضعیت‌ها، اقدام بعدی و اطلاعات مهم با زبان روشن و بدون پیچیدگی غیرضروری نمایش داده
              می‌شوند.
            </p>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
