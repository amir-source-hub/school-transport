import type { ReactNode } from "react";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface px-4 py-4"><p className="font-black">پنل خانواده</p></header><div className="mx-auto grid max-w-7xl lg:grid-cols-[16rem_1fr]"><aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-surface p-5 lg:block" aria-label="ناوبری پنل خانواده"><p className="text-sm text-muted">ناوبری پس از اتصال امن حساب فعال می‌شود.</p></aside><main className="p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
