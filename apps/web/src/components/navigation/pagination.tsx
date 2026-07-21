import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Pagination({
  currentPage,
  totalPages,
  getHref,
}: {
  currentPage: number;
  totalPages: number;
  getHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );
  return (
    <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-1">
      <Link
        aria-label="صفحه قبل"
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        href={currentPage === 1 ? getHref(1) : getHref(currentPage - 1)}
        className={cn(
          'grid size-11 place-items-center rounded-lg border border-border bg-surface',
          currentPage === 1 && 'pointer-events-none opacity-45',
        )}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
      {pages.map((page, index) => (
        <span key={page} className="contents">
          {index > 0 && pages[index - 1] !== page - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={getHref(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'grid size-11 place-items-center rounded-lg border text-sm font-bold',
              page === currentPage
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface hover:border-primary hover:text-primary',
            )}
          >
            {page}
          </Link>
        </span>
      ))}
      <Link
        aria-label="صفحه بعد"
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        href={currentPage === totalPages ? getHref(totalPages) : getHref(currentPage + 1)}
        className={cn(
          'grid size-11 place-items-center rounded-lg border border-border bg-surface',
          currentPage === totalPages && 'pointer-events-none opacity-45',
        )}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Link>
    </nav>
  );
}
