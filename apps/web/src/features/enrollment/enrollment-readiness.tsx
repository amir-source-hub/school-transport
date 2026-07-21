import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const readinessChecks = [
  ['ترتیب مراحل و فیلدها', 'در انتظار تکمیل سند فرم ثبت‌نام'],
  ['اعتبارسنجی و ذخیره پیش‌نویس', 'در انتظار قرارداد تأییدشده'],
  ['ارسال و اصلاح درخواست', 'در انتظار وضعیت‌ها و خطاهای قطعی API'],
] as const;

export function EnrollmentReadiness() {
  return (
    <div className="space-y-5">
      <Alert tone="warning" title="پیاده‌سازی نهایی ثبت‌نام مسدود است">
        سند enrollment-form-specification.md هنوز خالی است. برای جلوگیری از جمع‌آوری اطلاعات نادرست،
        هیچ فرم یا پیش‌نویسی در این صفحه فعال نشده است.
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
          ایجاد پیش‌نویس و ارسال درخواست فقط پس از تصویب سند فرم و قرارداد OpenAPI فعال می‌شود.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled>ایجاد پیش‌نویس پس از تصویب سند</Button>
          <Button variant="secondary" disabled>
            ادامه ثبت‌نام پس از اتصال API
          </Button>
        </div>
      </Card>
    </div>
  );
}
