import { Card } from '@/components/ui/card';

export function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری اعلان‌ها">
      {[1, 2, 3].map((item) => (
        <Card key={item} padding="md">
          <div className="space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-surface-muted" />
          </div>
        </Card>
      ))}
    </div>
  );
}
