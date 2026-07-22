import type { Metadata } from 'next';
import { PublicPageIntro } from '@/components/common/public-page-intro';
import { PageContainer } from '@/components/common/page-container';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'درباره سامانه' };

const values = [
  { title: 'شفاف برای خانواده', description: 'هر خانواده می‌تواند دانش‌آموزان خود را در یک حساب مدیریت کند و وضعیت هر دانش‌آموز را جداگانه ببیند.' },
  { title: 'ساختارمند برای مدیریت', description: 'بررسی درخواست، تعیین قیمت، قرارداد و پرداخت‌ها در فرایندی مشخص و قابل پیگیری انجام می‌شود.' },
  { title: 'متمرکز بر اعتماد', description: 'وضعیت‌ها، اقدام بعدی و اطلاعات مهم با زبان روشن و بدون پیچیدگی غیرضروری نمایش داده می‌شوند.' },
  { title: 'طراحی برای خانواده ایرانی', description: 'تجربه کاملاً فارسی، راست‌به‌چپ، واکنش‌گرا و مناسب استفاده با تلفن همراه برای همه کاربران.' },
  { title: 'امنیت و حریم خصوصی', description: 'اطلاعات شخصی و مالی خانواده‌ها با پروتکل‌های امنیتی رمزنگاری شده و دسترسی‌ها مبتنی بر نقش کنترل می‌شود.' },
  { title: 'پشتیبانی پاسخگو', description: 'تیم پشتیبانی در ساعات اداری آماده پاسخگویی به سوالات و رفع مشکلات خانواده‌ها است.' },
];

export default function AboutPage() {
  return (
    <>
      <PublicPageIntro
        eyebrow="درباره خدمت"
        title="یک مسیر یکپارچه برای خانواده و مدیریت مدرسه"
        description="سامانه سرویس مدرسه برای ثبت و پیگیری خدمات سرویس مدرسه، از درخواست اولیه تا قرارداد و پرداخت، طراحی شده است."
      />
      <PageContainer className="py-14 sm:py-18">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg leading-relaxed text-muted">
            سامانه سرویس مدرسه با هدف ایجاد شفافیت و سادگی در فرایند ثبت‌نام، قرارداد و پرداخت خدمات
            سرویس مدرسه طراحی شده است. خانواده‌ها می‌توانند تمام مراحل را در یک سامانه دنبال کنند و
            مدیریت نیز ابزارهای لازم برای بررسی، قیمت‌گذاری و پیگیری را در اختیار دارد.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {values.map((item) => (
            <Card key={item.title} variant="outlined" padding="md">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
