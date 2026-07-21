import type { ReactNode } from 'react';

export function Alert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-[var(--radius-md)] border border-border bg-primary-soft p-4 text-sm text-foreground"
    >
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-muted">{children}</div>
    </div>
  );
}
