import { Route } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex items-center justify-center bg-paper px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-foreground">
            <BrandMark size={24} />
            <span>سامانه سرویس مدرسه</span>
          </Link>
          <div className="mt-10">{children}</div>
          <p className="mt-8 text-center text-xs text-muted">
            <Link href="/" className="hover:text-primary transition-colors">بازگشت به صفحه اصلی</Link>
            <span className="mx-2">|</span>
            <Link href="/contact" className="hover:text-primary transition-colors">پشتیبانی</Link>
          </p>
        </div>
      </section>
      <aside
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
        aria-label="راهنمای ورود"
      >
        <Image src="/images/hero-main.png" alt="" fill className="object-cover object-[center_30%]" sizes="50vw" />
        <div className="absolute inset-0 bg-gradient-to-l from-navy/60 via-navy/50 to-navy/80" />
        <div className="relative z-10 max-w-md text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sun/20 text-sun backdrop-blur-sm">
            <Route aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-6 text-2xl font-black leading-relaxed text-white">
            مسیر امن فرزند شما، از خانه تا مدرسه
          </p>
          <p className="mt-4 text-white/60">
            پس از ورود، وضعیت دانش‌آموزان، قراردادها، پرداخت‌ها و اعلان‌ها را مشاهده کنید.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">ثبت‌نام آنلاین</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1">قرارداد شفاف</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1">پرداخت امن</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
