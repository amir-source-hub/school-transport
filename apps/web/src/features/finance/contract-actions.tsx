'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { acceptContract, rejectContract } from './contracts-api';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function ContractActions({
  id,
  templateHash,
  reviewedPages = [],
}: {
  id: string;
  templateHash?: string;
  reviewedPages?: number[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<'accept' | 'reject'>();
  const [error, setError] = useState<string>();
  async function act(action: 'accept' | 'reject') {
    setPending(action);
    setError(undefined);
    try {
      await (action === 'accept'
        ? acceptContract(id, templateHash ?? '', reviewedPages)
        : rejectContract(id));
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(undefined);
    }
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        loading={pending === 'accept'}
        disabled={Boolean(templateHash) && reviewedPages.length !== 3}
        onClick={() => act('accept')}
      >
        پذیرش قرارداد
      </Button>
      <Button variant="danger" loading={pending === 'reject'} onClick={() => act('reject')}>
        رد قرارداد
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
