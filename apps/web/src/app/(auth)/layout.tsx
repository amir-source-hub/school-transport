import Link from "next/link";
import { PageContainer } from "@/components/common/page-container";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="grid min-h-screen bg-surface lg:grid-cols-2"><section className="flex items-center"><PageContainer className="max-w-xl py-8"><Link href="/" className="font-black text-primary">سامانه سرویس مدرسه</Link><div className="mt-10">{children}</div></PageContainer></section><aside className="hidden items-center justify-center bg-primary-soft p-12 lg:flex" aria-label="راهنمای ورود"><div className="max-w-md"><p className="text-3xl font-black leading-relaxed">مدیریت ساده و یکپارچه خدمات سرویس مدرسه</p><p className="mt-4 text-muted">پس از ورود، وضعیت دانش‌آموزان، قراردادها، پرداخت‌ها و اعلان‌ها را مشاهده کنید.</p></div></aside></main>;
}
