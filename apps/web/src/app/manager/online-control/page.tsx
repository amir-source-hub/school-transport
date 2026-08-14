import { CameraOff, MapPinned, Radio } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'کنترل آنلاین' };
export default function Page() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'کنترل آنلاین' }]}
      />
      <header>
        <Badge>در حال آماده‌سازی</Badge>
        <h1 className="mt-3 text-2xl font-black">اتاق کنترل آنلاین</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          این صفحه فقط پیش‌نمایش رابط کاربری است. هیچ مکان، دوربین، مجوز دستگاه یا داده زنده‌ای
          دریافت نمی‌شود.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-h-72">
          <div className="flex justify-between">
            <MapPinned className="size-7 text-muted" />
            <Badge>موقعیت زنده غیرفعال</Badge>
          </div>
          <div className="grid min-h-44 place-items-center text-center">
            <div>
              <Radio className="mx-auto size-10 text-muted" />
              <p className="mt-3 font-black">نقشه زنده هنوز راه‌اندازی نشده است</p>
              <p className="mt-2 text-sm text-muted">هیچ کاشی نقشه یا داده GPS بارگیری نمی‌شود.</p>
            </div>
          </div>
          <Button disabled className="w-full">
            نمایش موقعیت زنده
          </Button>
        </Card>
        <Card className="min-h-72">
          <div className="flex justify-between">
            <CameraOff className="size-7 text-muted" />
            <Badge>ویدئو غیرفعال</Badge>
          </div>
          <div className="grid min-h-44 place-items-center text-center">
            <div>
              <CameraOff className="mx-auto size-10 text-muted" />
              <p className="mt-3 font-black">مشاهده داخل خودرو فعال نیست</p>
              <p className="mt-2 text-sm text-muted">
                هیچ درخواست دوربین یا پخش ویدئویی انجام نمی‌شود.
              </p>
            </div>
          </div>
          <Button disabled className="w-full">
            مشاهده تصویر خودرو
          </Button>
        </Card>
      </div>
    </div>
  );
}
