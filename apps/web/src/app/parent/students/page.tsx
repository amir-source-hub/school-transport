import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoStudents } from "@/features/students/mock-students";

export const metadata = { title: "دانش‌آموزان" };

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "پنل خانواده", href: "/parent/dashboard" }, { label: "دانش‌آموزان" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-bold text-primary">حساب خانواده</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">دانش‌آموزان</h1><p className="mt-2 text-sm text-muted">هر دانش‌آموز نمایه و سوابق مستقل دارد.</p></div>
        <ButtonLink href="/parent/students/new">افزودن دانش‌آموز</ButtonLink>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {demoStudents.map((student) => (
          <Card key={student.id}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{student.firstName} {student.lastName}</h2><p className="mt-1 text-sm text-muted">{student.school}</p></div><Badge tone={student.status === "نیازمند اصلاح" ? "danger" : "warning"}>{student.status}</Badge></div>
            <ButtonLink href={`/parent/students/${student.id}`} variant="secondary" className="mt-5 w-full">مشاهده نمایه مستقل</ButtonLink>
          </Card>
        ))}
      </div>
    </div>
  );
}
