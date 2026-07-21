import { ParentDashboard } from "@/features/parent-dashboard/parent-dashboard";
import { demoStudentDashboards } from "@/features/parent-dashboard/mock-parent-dashboard";

export const metadata = { title: "نمای کلی خانواده" };

export default function ParentDashboardPage() {
  return <ParentDashboard students={demoStudentDashboards} />;
}
