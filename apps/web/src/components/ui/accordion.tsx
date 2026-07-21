'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

export type AccordionItem = { value: string; title: string; content: string };

export function Accordion({ items }: { items: AccordionItem[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="flex flex-col gap-3" dir="rtl">
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-start font-bold transition-colors hover:bg-surface-muted">
              {item.title}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-primary transition-transform group-data-[state=open]:rotate-180"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden text-sm text-muted">
            <div className="border-t border-border px-5 py-4">{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
