import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="مسیر صفحه">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <li>
          <Link href="/" className="rounded px-1 py-1 hover:text-primary">
            خانه
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            <ChevronLeft aria-hidden="true" className="size-4" />
            {item.href ? (
              <Link href={item.href} className="rounded px-1 py-1 hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span className="px-1 py-1 font-bold text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
