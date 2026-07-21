import type { Metadata } from "next";
import { PublicPageIntro } from "@/components/common/public-page-intro";
import { PageContainer } from "@/components/common/page-container";
import { Alert } from "@/components/feedback/alert";

export const metadata: Metadata = { title: "مدارس" };

export default function SchoolsPage() {
  return <><PublicPageIntro eyebrow="مدارس تحت پوشش" title="انتخاب مدرسه از فهرست تأییدشده سامانه" description="اطلاعات مدرسه یکی از بخش‌های عملیاتی درخواست هر دانش‌آموز است و فهرست آن باید از داده‌های تأییدشده سامانه دریافت شود." /><PageContainer className="py-14"><div className="mx-auto max-w-2xl"><Alert title="فهرست مدارس در حال آماده‌سازی است">اسامی یا محدوده‌های پوشش در اسناد پروژه مشخص نشده‌اند؛ به همین دلیل هیچ مدرسه‌ای به‌صورت فرضی نمایش داده نمی‌شود. فهرست پس از اتصال به قرارداد رسمی مدارس در همین صفحه ارائه خواهد شد.</Alert></div></PageContainer></>;
}
