import { PageContainer } from '@/components/common/page-container';
import { Skeleton } from '@/components/feedback/skeleton';

export default function Loading() {
  return (
    <PageContainer className="py-16" aria-label="در حال بارگذاری">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-5 h-5 w-1/2" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </PageContainer>
  );
}
