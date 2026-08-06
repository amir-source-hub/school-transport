'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export type TabItem = { value: string; label: string; content: ReactNode };

export function Tabs({
  items,
  defaultValue,
  ariaLabel,
}: {
  items: TabItem[];
  defaultValue?: string;
  ariaLabel: string;
}) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value} dir="rtl">
      <TabsPrimitive.List
        aria-label={ariaLabel}
        className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-sm)] bg-surface-muted p-1"
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-bold leading-6 text-muted transition-colors hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-[var(--shadow-sm)]"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          className="mt-5 focus-visible:rounded-lg"
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
