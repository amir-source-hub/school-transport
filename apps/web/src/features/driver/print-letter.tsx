'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintLetterButton({ label = 'چاپ نامه' }: { label?: string }) {
  return <Button type="button" onClick={() => window.print()} className="print:hidden"><Printer className="size-4" />{label}</Button>;
}
