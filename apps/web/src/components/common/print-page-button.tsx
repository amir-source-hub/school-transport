'use client';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PrintPageButton({label='چاپ پرونده و قرارداد'}:{label?:string}){return <Button type="button" variant="ghost" className="print:hidden" onClick={()=>window.print()}><Printer className="size-4" aria-hidden="true"/>{label}</Button>}
