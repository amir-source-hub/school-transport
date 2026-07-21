import type { ReactNode } from 'react';

const tones = {
  info: 'border-border bg-primary-soft',
  warning: 'border-warning/25 bg-warning-soft',
  danger: 'border-danger/25 bg-danger-soft',
} as const;

export function Alert({
  title,
  children,
  tone = 'info',
}: {
  title: string;
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-[var(--radius-md)] border p-4 text-sm text-foreground ${tones[tone]}`}
    >
      <p className="font-bold">{title}</p>
      <div className="mt-1 text-muted">{children}</div>
    </div>
  );
}
