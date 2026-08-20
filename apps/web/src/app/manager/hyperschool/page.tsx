import { Coffee, Hammer, PackageOpen, Sparkles } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'هایپرمدرسه' };
export default function Page() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'هایپرمدرسه' }]}
      />
      <Card className="mx-auto max-w-5xl py-10 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Sparkles className="size-8" />
        </div>
        <Badge className="mt-5">به‌زودی</Badge>
        <h1 className="mt-4 text-2xl font-black">هایپرمدرسه در حال آماده‌سازی است</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
          در این مرحله هیچ اتصال، خرید یا تبادل داده‌ای با سرویس دیگری انجام نمی‌شود. جزئیات پس از
          نهایی‌شدن محصول اعلام خواهد شد.
        </p>
        <div className="mt-8 grid gap-4 text-right md:grid-cols-3">
          {(
            [
              ['خدماتی', Hammer, ['تأسیسات', 'برق‌کاری', 'تعمیرات', 'عمرانی', 'بازسازی']],
              ['بوفه', Coffee, ['تأمین اقلام خوراکی و مصرفی']],
              ['مصرفی مدرسه', PackageOpen, ['لوازم و تحریر', 'پذیرایی', 'شوینده و بهداشتی']],
            ] as const
          ).map(([title, Icon, items]) => (
            <section key={title} className="rounded-2xl border border-border bg-surface-muted p-5">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-3 font-black">{title}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {items.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
              <Badge className="mt-4">به‌زودی</Badge>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}
