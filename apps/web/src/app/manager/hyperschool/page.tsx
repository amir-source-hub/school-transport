import { Sparkles } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'هایپراسکول' };
export default function Page() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'هایپراسکول' }]}
      />
      <Card className="mx-auto max-w-3xl py-14 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Sparkles className="size-8" />
        </div>
        <Badge className="mt-5">به‌زودی</Badge>
        <h1 className="mt-4 text-2xl font-black">هایپراسکول در حال آماده‌سازی است</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
          در این مرحله هیچ اتصال، خرید یا تبادل داده‌ای با سرویس دیگری انجام نمی‌شود. جزئیات پس از
          نهایی‌شدن محصول اعلام خواهد شد.
        </p>
      </Card>
    </div>
  );
}
