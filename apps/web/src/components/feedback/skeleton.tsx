export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[var(--radius-sm)] bg-surface-muted ${className}`} />;
}
