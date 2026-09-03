'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintLetterButton() {
  return <Button type="button" onClick={() => window.print()} className="print:hidden"><Printer className="size-4" />چاپ نامه</Button>;
}
