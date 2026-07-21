'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster dir="rtl" position="top-center" richColors closeButton />
    </>
  );
}
