import { notFound } from "next/navigation";

import { Alert } from "@/components/feedback/alert";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { demoStudents, getDemoStudent } from "@/features/students/mock-students";

export const generateStaticParams = () => demoStudents.map(({ id: studentId }) => ({ studentId }));

export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = getDemoStudent(studentId);
  if (!student) notFound();

  const rows = [
    ["نام", student.firstName], ["نام خانوادگی", student.lastName], ["نام پدر", student.fatherName],
    ["کد ملی", student.nationalId], ["نشانی خانه", student.homeAddress], ["مدرسه", student.school],
    ["پایه", student.grade], ["سال تحصیلی", student.academicYear],
  ] as const;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "پنل خانواده", href: "/parent/dashboard" }, { label: "دانش‌آموزان", href: "/parent/students" }, { label: `${student.firstName} ${student.lastName}` }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold text-primary">نمایه مستقل دانش‌آموز</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{student.firstName} {student.lastName}</h1></div><Badge tone={student.status === "نیازمند اصلاح" ? "danger" : "warning"}>{student.status}</Badge></div>
      <Alert tone="warning" title="فیلدهای حفاظت‌شده">کد ملی، مدرسه، پایه، سال تحصیلی و اطلاعات خدمت پس از ارسال مستقیماً قابل تغییر نیستند و تغییر آن‌ها به بررسی مدیریت نیاز دارد.</Alert>
      <Card><h2 className="text-lg font-black">اطلاعات دانش‌آموز</h2><dl className="mt-4 divide-y divide-border text-sm">{rows.map(([label, value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted">{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></Card>
    </div>
  );
}
