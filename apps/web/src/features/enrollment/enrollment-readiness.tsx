import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const readinessChecks = [
  ['ترتیب مراحل و فیلدها', 'در سند فرم ثبت‌نام مشخص و آماده پیاده‌سازی است'],
  ['اعتبارسنجی و ذخیره پیش‌نویس', 'قواعد رابط مشخص است؛ اتصال سرور در انتظار OpenAPI قطعی است'],
  ['ارسال و اصلاح درخواست', 'رابط قابل توسعه است؛ نام وضعیت اصلاح باید با API یکسان شود'],
] as const;

export function EnrollmentReadiness() {
  return (
    <div className="space-y-5">
      <Alert title="مشخصات فرم ثبت‌نام دریافت شد">
        ساخت رابط شش‌مرحله‌ای بر اساس سند جدید آغاز می‌شود. ذخیره و ارسال واقعی تا زمان تثبیت
        قرارداد OpenAPI غیرفعال می‌ماند.
      </Alert>

      <Card>
        <h2 className="text-lg font-black">آمادگی فرایند ثبت‌نام</h2>
        <dl className="mt-4 divide-y divide-border">
          {readinessChecks.map(([label, status]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="font-bold">{label}</dt>
              <dd className="text-sm text-muted">{status}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="font-black">اقدام‌های ثبت‌نام</h2>
        <p className="mt-2 text-sm text-muted">
          پیاده‌سازی فرم در مرحله بعد انجام می‌شود؛ این صفحه هنوز داده‌ای جمع‌آوری یا ارسال نمی‌کند.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled>فرم چندمرحله‌ای در حال توسعه</Button>
          <Button variant="secondary" disabled>
            ارسال واقعی پس از تثبیت API
          </Button>
        </div>
      </Card>
    </div>
  );
}
