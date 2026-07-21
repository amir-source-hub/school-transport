'use client';

import { PageContainer } from '@/components/common/page-container';
import { Button } from '@/components/ui/button';

export function RouteError({ reset, area = 'این بخش' }: { reset: () => void; area?: string }) {
  return (
    <PageContainer className="py-14">
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-danger/20 bg-danger-soft p-8 text-center"
      >
        <span
          aria-hidden="true"
          className="mx-auto grid size-12 place-items-center rounded-full bg-white font-black text-danger"
        >
          !
        </span>
        <h1 className="mt-4 text-xl font-black">نمایش {area} با مشکل روبه‌رو شد</h1>
        <p className="mt-2 text-sm text-muted">
          اتصال خود را بررسی کنید و دوباره تلاش کنید. جزئیات فنی نمایش داده نمی‌شوند.
        </p>
        <Button className="mt-6" onClick={reset}>
          تلاش دوباره
        </Button>
      </div>
    </PageContainer>
  );
}
