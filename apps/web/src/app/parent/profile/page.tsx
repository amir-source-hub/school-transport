import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FamilyProfileForm } from "@/features/family-profile/family-profile-form";

export const metadata = { title: "اطلاعات خانواده" };

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "پنل خانواده", href: "/parent/dashboard" }, { label: "اطلاعات خانواده" }]} />
      <div>
        <p className="text-sm font-bold text-primary">پروفایل خانواده</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">اطلاعات مجاز را ویرایش کنید</h1>
        <p className="mt-2 text-sm text-muted">شماره اصلی و شناسه‌های حساس از مسیرهای تأییدشده جداگانه تغییر می‌کنند.</p>
      </div>
      <FamilyProfileForm />
    </div>
  );
}
