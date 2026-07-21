import type { ComponentPropsWithoutRef } from "react";

export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] ${className}`} {...props} />;
}
