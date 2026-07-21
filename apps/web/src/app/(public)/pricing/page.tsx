import type { Metadata } from "next";
import { PublicPageIntro } from "@/components/common/public-page-intro";
import { PageContainer } from "@/components/common/page-container";
import { Alert } from "@/components/feedback/alert";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "نحوه قیمت‌گذاری" };

export default function PricingPage() {
  return <><PublicPageIntro eyebrow="قیمت‌گذاری و پرداخت" title="قیمت نهایی پس از بررسی درخواست تعیین می‌شود" description="در زمان ثبت‌نام قیمت عمومی ثابتی وجود ندارد. مدیریت پس از بررسی اطلاعات دانش‌آموز و جزئیات خدمت، قیمت دوره کامل را تعیین می‌کند." /><PageContainer className="py-14"><Alert title="قیمت در فرم ثبت‌نام محاسبه نمی‌شود">هر مبلغ نهایی فقط پس از بررسی و از طرف سامانه اعلام می‌شود. رابط کاربری قیمت یا شرایط نهایی را به‌صورت مستقل محاسبه نمی‌کند.</Alert><div className="mt-8 grid gap-5 md:grid-cols-3"><Card><p className="text-sm font-bold text-primary">مرحله ۱</p><h2 className="mt-2 font-black">ارسال درخواست</h2><p className="mt-2 text-sm text-muted">خانواده درخواست خدمت مربوط به یک دانش‌آموز را ثبت می‌کند.</p></Card><Card><p className="text-sm font-bold text-primary">مرحله ۲</p><h2 className="mt-2 font-black">بررسی مدیریت</h2><p className="mt-2 text-sm text-muted">مدیریت درخواست و جزئیات خدمت را بررسی و قیمت دوره را تعیین می‌کند.</p></Card><Card><p className="text-sm font-bold text-primary">مرحله ۳</p><h2 className="mt-2 font-black">انتخاب روش پرداخت</h2><p className="mt-2 text-sm text-muted">گزینه پرداخت کامل یا برنامه اقساطی، دقیقاً مطابق اطلاعات بازگشتی سامانه نمایش داده می‌شود.</p></Card></div></PageContainer></>;
}
