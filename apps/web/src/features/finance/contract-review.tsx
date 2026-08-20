'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractActions } from './contract-actions';

type StoredReview = { page: number; reviewed: number[]; scroll: Record<number, number> };

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function ContractReview({
  contractId,
  version,
  templateHash,
  pages,
  canAct,
  onReviewedPagesChange,
}: {
  contractId: string;
  version: number;
  templateHash: string;
  pages: string[][];
  canAct: boolean;
  onReviewedPagesChange?: (pages: number[]) => void;
}) {
  const storageKey = `contract-review:${contractId}:${version}:${templateHash}`;
  const [page, setPage] = useState(1);
  const [reviewed, setReviewed] = useState<number[]>([1]);
  const [hydrated, setHydrated] = useState(false);
  const scrollByPage = useRef<Record<number, number>>({});
  const articleRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const totalPages = pages.length;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? '') as StoredReview;
        if (stored.page >= 1 && stored.page <= totalPages) setPage(stored.page);
        setReviewed(stored.reviewed?.filter((item) => item >= 1 && item <= totalPages) ?? [1]);
        scrollByPage.current = stored.scroll ?? {};
      } catch {
        // A malformed or stale local value safely restarts at page one.
      }
      setHydrated(true);
    });
  }, [storageKey, totalPages]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ page, reviewed, scroll: scrollByPage.current } satisfies StoredReview),
    );
    requestAnimationFrame(() => {
      if (articleRef.current) articleRef.current.scrollTop = scrollByPage.current[page] ?? 0;
      headingRef.current?.focus();
    });
  }, [hydrated, page, reviewed, storageKey]);

  useEffect(() => {
    if (hydrated) onReviewedPagesChange?.(reviewed);
  }, [hydrated, onReviewedPagesChange, reviewed]);

  function move(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage > Math.max(...reviewed) + 1) return;
    scrollByPage.current[page] = articleRef.current?.scrollTop ?? 0;
    setPage(nextPage);
    setReviewed((current) => [...new Set([...current, nextPage])].sort());
  }

  function download() {
    const body = pages
      .map(
        (items, index) =>
          `<section class="page"><h1>صفحه ${index + 1} از ${totalPages}</h1>${items.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</section>`,
      )
      .join('');
    const html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>قرارداد</title><style>@page{size:A4;margin:12mm}body{font-family:Tahoma,sans-serif;line-height:1.75}.page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}h1{font-size:16px}p{font-size:11px;text-align:justify;orphans:3;widows:3}</style>${body}</html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contract-${contractId}-v${version}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="contract-viewer-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 id="contract-viewer-title" className="text-lg font-black">
          متن سه‌صفحه‌ای قرارداد
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            چاپ
          </Button>
          <Button variant="ghost" onClick={download}>
            <Download className="size-4" aria-hidden="true" />
            دانلود
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-primary/10 bg-primary-soft/40 p-3 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm font-black text-navy">
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </p>
          <p className="text-xs font-bold text-muted">پیشرفت مطالعه قرارداد</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden="true">
          {pages.map((_, index) => {
            const pageNumber = index + 1;
            const isReviewed = reviewed.includes(pageNumber);
            return (
              <span
                key={pageNumber}
                className={`h-2 rounded-full transition-colors ${isReviewed ? 'bg-primary' : 'bg-border'}`}
              />
            );
          })}
        </div>
      </div>
      <article
        ref={articleRef}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(page + 1);
          if (event.key === 'ArrowRight') move(page - 1);
        }}
        onScroll={(event) => {
          scrollByPage.current[page] = event.currentTarget.scrollTop;
        }}
        className="max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white p-5 leading-8 shadow-sm sm:p-8 print:hidden"
      >
        <h3 ref={headingRef} tabIndex={-1} className="sr-only">
          صفحه {page} از {totalPages}
        </h3>
        {pages[page - 1]?.map((paragraph, index) => (
          <p key={index} className="mb-4 text-justify text-sm">
            {paragraph}
          </p>
        ))}
      </article>
      <div className="rounded-2xl border border-border/70 bg-surface-soft p-3 print:hidden">
        <p className="mb-3 text-center text-xs font-bold text-muted">پیمایش صفحات قرارداد</p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="w-full"
            variant="secondary"
            disabled={page === 1}
            onClick={() => move(page - 1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
            صفحه قبل
          </Button>
          <Button className="w-full" disabled={page === totalPages} onClick={() => move(page + 1)}>
            صفحه بعد
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {reviewed.length === totalPages && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs font-black text-success">
            <Check className="size-4" aria-hidden="true" />
            همه صفحات قرارداد مطالعه شد
          </p>
        )}
      </div>
      <div className="hidden print:block">
        {pages.map((items, pageIndex) => (
          <article key={pageIndex} className="contract-print-page">
            <h2>
              صفحه {pageIndex + 1} از {totalPages}
            </h2>
            {items.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
        ))}
      </div>
      {canAct && (
        <ContractActions id={contractId} templateHash={templateHash} reviewedPages={reviewed} />
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          nav, header, aside, [data-app-navigation] { display: none !important; }
          .contract-print-page { break-after: page; page-break-after: always; font-size: 10pt; line-height: 1.7; }
          .contract-print-page:last-child { break-after: auto; page-break-after: auto; }
          .contract-print-page h2, .contract-print-page p { break-inside: avoid; orphans: 3; widows: 3; }
        }
      `}</style>
    </section>
  );
}
