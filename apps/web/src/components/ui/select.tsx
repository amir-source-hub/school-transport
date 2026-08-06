'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SelectOption = { value: string; label: string };

export function Select({
  options,
  placeholder = 'انتخاب کنید',
  value,
  onValueChange,
  name,
  disabled,
  className,
}: {
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
      dir="rtl"
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 text-sm shadow-[var(--shadow-sm)] transition-colors hover:border-slate-400 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown aria-hidden="true" className="size-4 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-11 cursor-pointer select-none items-center rounded-md py-2 pe-9 ps-3 text-sm leading-6 outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-hover"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute end-3">
                  <Check aria-hidden="true" className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
