'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export function DrawerContent({
  title,
  description,
  children,
  side = 'right',
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  side?: 'right' | 'left';
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn(
          'fixed inset-y-0 z-50 flex max-h-[100dvh] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-md)]',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
      >
        <div className="pe-9">
          <DialogPrimitive.Title className="text-lg font-black">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1">
          {children}
        </div>
        <DialogPrimitive.Close
          aria-label="بستن"
          className="absolute end-3 top-3 grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
