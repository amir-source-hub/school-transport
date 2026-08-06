'use client';

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 rounded-[var(--radius-sm)] border border-border bg-surface p-1 shadow-[var(--shadow-md)]',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  children,
  danger,
  disabled,
  onSelect,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex min-h-11 cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm leading-6 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-hover',
        danger && 'text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger',
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
}
