import type { Metadata } from "next";
import { PublicPageIntro } from "@/components/common/public-page-intro";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = { title: "پرسش‌های متداول" };

const questions = [
  ["آیا یک خانواده می‌تواند چند دانش‌آموز ثبت کند؟", "بله. یک حساب خانوادگی می‌تواند چند دانش‌آموز را مدیریت کند و اطلاعات، درخواست، قرارداد و پرداخت‌های هر دانش‌آموز جداگانه نگهداری می‌شود."],
  ["قیمت سرویس چه زمانی مشخص می‌شود؟", "قیمت ثابت عمومی در زمان ثبت‌نام وجود ندارد. مدیریت پس از بررسی درخواست و جزئیات خدمت، قیمت دوره کامل را تعیین می‌کند."],
  ["آیا ثبت درخواست به معنی تأیید سرویس است؟", "خیر. درخواست پس از ارسال نیاز به بررسی مدیریت دارد و وضعیت تأیید، رد یا درخواست اصلاح در سامانه نمایش داده می‌شود."],
  ["چه روش‌های پرداختی وجود دارد؟", "مطابق اسناد، پرداخت آنلاین و پرداخت آفلاین با بررسی مدیریت پشتیبانی می‌شوند. گزینه پرداخت کامل یا اقساطی طبق اطلاعات اعلام‌شده برای قرارداد نمایش داده خواهد شد."],
  ["آیا می‌توان اطلاعات ثبت‌شده را ویرایش کرد؟", "اطلاعات ساده و غیرعملیاتی در محدوده مجاز قابل ویرایش‌اند. اطلاعات حساس مانند مدرسه، خدمت تأییدشده، قیمت و وضعیت پرداخت تحت کنترل مدیریت باقی می‌مانند."],
] as const;

export default function FaqPage() {
  return <><PublicPageIntro eyebrow="پرسش‌های متداول" title="پاسخ کوتاه به پرسش‌های اصلی خانواده‌ها" description="درباره حساب خانوادگی، بررسی درخواست، قیمت، پرداخت و ویرایش اطلاعات بیشتر بدانید." /><PageContainer className="py-14"><div className="mx-auto flex max-w-3xl flex-col gap-3">{questions.map(([question, answer]) => <details key={question} className="group rounded-[var(--radius-md)] border border-border bg-surface p-5"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-bold"><span>{question}</span><span aria-hidden="true" className="text-xl text-primary transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 border-t border-border pt-3 text-sm text-muted">{answer}</p></details>)}</div></PageContainer></>;
}
