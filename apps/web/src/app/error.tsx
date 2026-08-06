'use client';

import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/common/page-container';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer className="py-20">
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-danger/20 bg-danger-soft p-8 text-center"
      >
        <h1 className="text-2xl font-black">مشکلی پیش آمد</h1>
        <p className="mt-3 text-muted">نمایش سامانه با یک خطای غیرمنتظره روبه‌رو شد.</p>
        <Button className="mt-6" onClick={reset}>
          تلاش دوباره
        </Button>
      </div>
    </PageContainer>
  );
}
