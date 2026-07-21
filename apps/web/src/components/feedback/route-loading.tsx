import { PageContainer } from '@/components/common/page-container';
import { Skeleton } from '@/components/feedback/skeleton';

export function RouteLoading({ compact = false }: { compact?: boolean }) {
  return (
    <PageContainer className={compact ? 'py-8' : 'py-14'}>
      <div role="status" aria-label="در حال بارگذاری">
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="mt-4 h-4 w-1/2 max-w-sm" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <span className="sr-only">لطفاً صبر کنید.</span>
      </div>
    </PageContainer>
  );
}
