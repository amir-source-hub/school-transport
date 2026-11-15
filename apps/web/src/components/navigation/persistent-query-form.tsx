'use client';

import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export function PersistentQueryForm({ path, className, ariaLabel, children }: {
  path: string; className?: string; ariaLabel?: string; children: ReactNode;
}) {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
    }
    const destination = `${path}${query.size ? `?${query}` : ''}`;
    window.history.pushState(null, '', destination);
    router.refresh();
  }
  return <form className={className} aria-label={ariaLabel} onSubmit={submit}>{children}</form>;
}
