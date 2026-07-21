import type { ReactNode } from "react";

export function ErrorState({ title = "دریافت اطلاعات ناموفق بود", description, action }: { title?: string; description: string; action?: ReactNode }) {
  return <div role="alert" className="rounded-[var(--radius-lg)] border border-danger/20 bg-danger-soft px-5 py-10 text-center"><span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-white font-black text-danger">!</span><h2 className="mt-4 font-black">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
