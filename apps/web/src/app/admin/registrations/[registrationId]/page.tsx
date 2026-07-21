import { notFound } from "next/navigation";

import { Alert } from "@/components/feedback/alert";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoRegistrations, getDemoRegistration, getRegistrationTone } from "@/features/admin-registrations/mock-registrations";

export const generateStaticParams = () => demoRegistrations.map(({ id: registrationId }) => ({ registrationId }));

export default async function RegistrationPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await params;
  const registration = getDemoRegistration(registrationId);
  if (!registration) notFound();
  const canReview = registration.status === "در حال بررسی";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "پنل مدیریت", href: "/admin/dashboard" }, { label: "درخواست‌ها", href: "/admin/registrations" }, { label: registration.trackingCode }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold text-primary">{registration.trackingCode}</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">بررسی درخواست {registration.student}</h1></div><Badge tone={getRegistrationTone(registration.status)}>{registration.status}</Badge></div>
      <Alert tone="warning" title="بررسی نمایشی و بدون تغییر رکورد">پیش از هر اقدام واقعی، مجوز مدیر، نسخه رکورد و وضعیت جاری باید دوباره در سرور بررسی شود. اقدام‌های حساس در حالت mock غیرفعال‌اند.</Alert>
      <Card><h2 className="text-lg font-black">خلاصه درخواست</h2><dl className="mt-4 divide-y divide-border text-sm">{[["دانش‌آموز", registration.student], ["خانواده", registration.family], ["مدرسه", registration.school], ["وضعیت", registration.status], ["اقدام بعدی", registration.nextAction]].map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></Card>
      <Card><h2 className="text-lg font-black">تصمیم مدیریت</h2><p className="mt-2 text-sm text-muted">{canReview ? "این وضعیت اجازه تصمیم مدیریت را می‌دهد؛ اما mock نمی‌تواند رکورد را تغییر دهد." : "این وضعیت اجازه تصمیم مستقیم بررسی را نمی‌دهد."} رد یا درخواست اصلاح باید همراه دلیل ثبت و همه تصمیم‌ها باید در سابقه ممیزی ذخیره شوند.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button disabled>تأیید درخواست</Button><Button variant="secondary" disabled>درخواست اصلاح با دلیل</Button><Button variant="secondary" disabled>رد درخواست با دلیل</Button></div></Card>
    </div>
  );
}
