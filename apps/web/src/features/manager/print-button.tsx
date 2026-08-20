'use client';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PrintButton({ label = 'چاپ پرونده و مدارک' }: { label?: string }) {
  return <Button type="button" variant="secondary" className="print:hidden" onClick={() => window.print()}><Printer className="size-4" />{label}</Button>;
}
