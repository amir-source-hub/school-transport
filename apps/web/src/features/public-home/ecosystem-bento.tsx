import { Card } from '@/components/ui/card';

const items = [
  {
    title: 'ثبت‌نام آنلاین',
    description: 'فرایند ثبت‌نام سرویس مدرسه را به صورت کاملاً آنلاین و در چند مرحله ساده انجام دهید.',
    color: 'bg-primary-soft text-primary',
    span: 'lg:col-span-2 lg:row-span-1',
  },
  {
    title: 'مدیریت قراردادها',
    description: 'قراردادها را مرور کنید و وضعیت پذیرش و جزئیات مالی را ببینید.',
    color: 'bg-success-soft text-success',
    span: '',
  },
  {
    title: 'پرداخت امن',
    description: 'پرداخت‌ها را پیگیری کنید و از وضعیت تأیید یا نیاز به اقدام مطلع شوید.',
    color: 'bg-warning-soft text-warning',
    span: '',
  },
  {
    title: 'اعلان‌های هوشمند',
    description: 'از تغییر وضعیت درخواست، قرارداد جدید و موارد نیازمند اقدام آگاه شوید.',
    color: 'bg-primary-soft text-primary',
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    title: 'خانواده چند فرزندی',
    description: 'تمام دانش‌آموزان خانواده را در یک حساب مدیریت کنید.',
    color: 'bg-danger-soft text-danger',
    span: 'lg:col-span-3 lg:row-span-1',
  },
] as const;

export function EcosystemBento() {
  return (
    <section className="surface-inset border-y border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold text-primary">همه چیز در یک سامانه</p>
          <h2 className="mt-2 text-3xl font-black">خدمات یکپارچه برای خانواده‌ها</h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          {items.map((item) => (
            <Card
              key={item.title}
              variant="raised"
              padding="lg"
              className={`flex flex-col ${item.span}`}
            >
              <span className={`mb-4 inline-flex w-fit rounded-lg px-3 py-1 text-xs font-bold ${item.color}`}>
                {item.title}
              </span>
              <p className="text-sm text-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
