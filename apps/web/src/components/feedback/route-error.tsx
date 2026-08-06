'use client';

import { PageContainer } from '@/components/common/page-container';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { useEffect, useRef, useState } from 'react';

export function RouteError({
  error,
  reset,
  area = 'این بخش',
}: {
  error: unknown;
  reset: () => void | Promise<void>;
  area?: string;
}) {
  const feedback = getApiErrorFeedback(error);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryLock = useRef(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function retry() {
    if (retryLock.current || !feedback.canRetry) return;
    retryLock.current = true;
    setRetrying(true);
    try {
      await reset();
    } finally {
      retryLock.current = false;
      setRetrying(false);
    }
  }

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
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-xl font-black">
          {feedback.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{feedback.message}</p>
        <p className="mt-2 text-xs text-muted">بخش: {area}</p>
        {feedback.canRetry && (
          <Button className="mt-6" onClick={retry} loading={retrying} disabled={retrying}>
            {retrying ? 'در حال تلاش…' : 'تلاش دوباره'}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
