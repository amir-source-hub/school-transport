import {
  ArrowLeft,
  Bus,
  Camera,
  GraduationCap,
  Image,
  MessageSquareText,
  Monitor,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getManagerDashboard } from '@/features/manager/manager-api';
import { formatJalaliDateTime } from '@/lib/formatters';
export const metadata = { title: 'داشبورد' };
const status: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  APPROVED: 'تأییدشده',
  CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  ENROLLED: 'فعال',
};
export default async function Page() {
  const d = await getManagerDashboard();
  const cards = [
    ['دانش‌آموز فعال', d.counts.activeStudents, GraduationCap],
    ['عکس تأییدشده', d.counts.studentsWithApprovedPhoto, Image],
    ['بازخورد بی‌پاسخ', d.unansweredFeedback, MessageSquareText],
  ] as const;
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیر مدرسه' }, { label: 'داشبورد' }]} />
      <header>
        <p className="text-sm font-bold text-primary">{d.school.name}</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">سلام مدیر محترم، نمای امروز مدرسه</h1>
        <p className="mt-2 text-sm text-muted">آمار واقعی مدرسه و مسیرهای سریع عملیات</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <Icon className="size-5 text-primary" />
            <p className="mt-4 text-3xl font-black">{value.toLocaleString('fa-IR')}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Card>
        ))}
        <Card>
          <div className="flex justify-between">
            <Bus className="size-5 text-warning" />
            <Badge tone="warning">آزمایشی</Badge>
          </div>
          <p className="mt-4 text-3xl font-black">۳</p>
          <p className="mt-1 text-sm text-muted">راننده نمونه</p>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">فعالیت‌های اخیر</h2>
            <ButtonLink href="/manager/students" variant="ghost" size="sm">
              همه دانش‌آموزان
              <ArrowLeft className="size-4" />
            </ButtonLink>
          </div>
          {d.recentActivity.length ? (
            <div className="mt-4 divide-y divide-border">
              {d.recentActivity.map((x) => (
                <div key={x.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-bold">{x.studentName}</p>
                    <p className="text-muted">{x.serviceType}</p>
                  </div>
                  <div className="text-end">
                    <Badge tone="info">
                      {status[x.registrationStatus] ?? x.registrationStatus}
                    </Badge>
                    <p className="mt-1 text-xs text-muted">{formatJalaliDateTime(x.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              هنوز فعالیت ثبت‌نامی برای این مدرسه ثبت نشده است.
            </p>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="font-black">دسترسی سریع</h2>
            <div className="mt-4 grid gap-2">
              <ButtonLink href="/manager/students" variant="secondary">
                مشاهده دانش‌آموزان
              </ButtonLink>
              <ButtonLink href="/manager/drivers" variant="secondary">
                پیش‌نمایش رانندگان
              </ButtonLink>
              <ButtonLink href="/manager/feedback" variant="secondary">
                ارسال بازخورد
              </ButtonLink>
            </div>
          </Card>
          <Card className="bg-primary-soft">
            <div className="flex gap-3">
              <Monitor className="size-5 text-primary" />
              <div>
                <h2 className="font-black">امکانات در راه</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  موقعیت زنده، تصویر خودرو و هایپرمدرسه به‌زودی در دسترس قرار می‌گیرند.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge>GPS غیرفعال</Badge>
              <Badge>
                <Camera className="me-1 size-3" />
                ویدئو غیرفعال
              </Badge>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
