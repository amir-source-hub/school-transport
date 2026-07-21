import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface px-4 py-4"><p className="font-black">پنل مدیریت</p></header><div className="mx-auto grid max-w-[90rem] lg:grid-cols-[17rem_1fr]"><aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-surface p-5 lg:block" aria-label="ناوبری پنل مدیریت"><p className="text-sm text-muted">ناوبری براساس مجوزهای حساب نمایش داده خواهد شد.</p></aside><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
