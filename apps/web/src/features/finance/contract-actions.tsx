'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { acceptContract, rejectContract } from './contracts-api';

export function ContractActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<'accept' | 'reject'>();
  async function act(action: 'accept' | 'reject') {
    setPending(action);
    try {
      await (action === 'accept' ? acceptContract(id) : rejectContract(id));
      router.refresh();
    } finally {
      setPending(undefined);
    }
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button loading={pending === 'accept'} onClick={() => act('accept')}>
        پذیرش قرارداد
      </Button>
      <Button variant="danger" loading={pending === 'reject'} onClick={() => act('reject')}>
        رد قرارداد
      </Button>
    </div>
  );
}
