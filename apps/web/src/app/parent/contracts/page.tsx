import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoContract } from "@/features/finance/mock-finance";

export const metadata = { title: "قراردادها" };

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "پنل خانواده", href: "/parent/dashboard" }, { label: "قراردادها" }]} />
      <div><p className="text-sm font-bold text-primary">قراردادهای هر دانش‌آموز</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">قراردادها</h1><p className="mt-2 text-sm text-muted">وضعیت و نسخه قرارداد هر دانش‌آموز مستقل نمایش داده می‌شود.</p></div>
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-black">{demoContract.studentName}</h2><p className="mt-1 text-sm text-muted">{demoContract.number} — {demoContract.version}</p></div><Badge tone="warning">{demoContract.status}</Badge></div>
        <ButtonLink href={`/parent/contracts/${demoContract.id}`} variant="secondary" className="mt-5 w-full sm:w-auto">مشاهده قرارداد نمایشی</ButtonLink>
      </Card>
    </div>
  );
}
