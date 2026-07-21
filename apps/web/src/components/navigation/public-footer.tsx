import Link from "next/link";
import { PageContainer } from "@/components/common/page-container";

export function PublicFooter() {
  return <footer className="mt-auto border-t border-border bg-surface">
    <PageContainer className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
      <div><p className="font-black">سامانه سرویس مدرسه</p><p className="mt-2 max-w-sm text-sm text-muted">مسیر روشن و یکپارچه برای ثبت درخواست، قرارداد و پرداخت خدمات سرویس مدرسه.</p></div>
      <nav aria-label="پیوندهای راهنما" className="flex flex-col gap-2 text-sm"><p className="font-bold">راهنما</p><Link href="/registration-guide">مراحل ثبت‌نام</Link><Link href="/pricing">نحوه قیمت‌گذاری</Link><Link href="/faq">پرسش‌های متداول</Link></nav>
      <div className="text-sm"><p className="font-bold">پشتیبانی</p><p className="mt-2 text-muted">برای دریافت راهنمایی، از صفحه تماس با ما استفاده کنید.</p><Link href="/contact" className="mt-3 inline-block font-bold text-primary">تماس با پشتیبانی</Link></div>
    </PageContainer>
    <div className="border-t border-border"><PageContainer className="py-4 text-xs text-muted">تمامی حقوق این سامانه محفوظ است.</PageContainer></div>
  </footer>;
}
