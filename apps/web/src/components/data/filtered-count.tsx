import { Hash } from 'lucide-react';
export function FilteredCount({count,label='مورد'}:{count:number;label?:string}){return <p role="status" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-bold text-foreground"><Hash className="size-4 text-primary" aria-hidden="true"/><span>{count.toLocaleString('fa-IR')} {label}</span></p>}
