'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn(
          'fixed start-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-md)]',
          className,
        )}
      >
        <div className="pe-8">
          <DialogPrimitive.Title className="text-xl font-black">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-2 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        <div className="mt-6">{children}</div>
        <DialogPrimitive.Close
          aria-label="بستن"
          className="absolute end-4 top-4 grid size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogClose = DialogPrimitive.Close;
