'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractActions } from './contract-actions';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

export function ContractReview({ contractId, version, templateHash, pages, canAct, onReviewedPagesChange }: {
  contractId: string;
  version: number;
  templateHash: string;
  pages: string[][];
  canAct: boolean;
  onReviewedPagesChange?: (pages: number[]) => void;
}) {
  const storageKey = `contract-review:${contractId}:${version}:${templateHash}`;
  const [reviewed, setReviewed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const allPages = pages.map((_, index) => index + 1);

  useEffect(() => {
    queueMicrotask(() => {
      try { setReviewed(localStorage.getItem(storageKey) === 'reviewed'); } catch { /* Storage may be disabled. */ }
      setHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    onReviewedPagesChange?.(reviewed ? Array.from({ length: pages.length }, (_, index) => index + 1) : []);
    if (reviewed) {
      try { localStorage.setItem(storageKey, 'reviewed'); } catch { /* Storage may be disabled. */ }
    }
  }, [hydrated, reviewed, onReviewedPagesChange, storageKey, pages.length]);

  function markReviewedIfAtEnd(element: HTMLElement) {
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24) setReviewed(true);
  }

  function download() {
    const body = pages.map((items, index) =>
      `<section class="page"><h1>صفحه ${index + 1} از ${pages.length}</h1>${items.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</section>`).join('');
    const html = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>قرارداد</title><style>@page{size:A4;margin:12mm}body{font-family:Tahoma,sans-serif;line-height:1.75}.page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}h1{font-size:16px}p{font-size:11px;text-align:justify;orphans:3;widows:3}</style>${body}</html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contract-${contractId}-v${version}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return <section aria-labelledby="contract-viewer-title" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h2 id="contract-viewer-title" className="text-lg font-black">متن قرارداد</h2>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" />چاپ</Button>
        <Button variant="ghost" onClick={download}><Download className="size-4" aria-hidden="true" />دانلود</Button>
      </div>
    </div>
    <article ref={articleRef} tabIndex={0} aria-label="متن قرارداد" onScroll={(event) => markReviewedIfAtEnd(event.currentTarget)}
      className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-white px-5 py-7 leading-8 text-navy shadow-sm sm:px-10 sm:py-10 print:max-h-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
      {pages.map((items, pageIndex) => <section key={pageIndex} className="contract-print-page mb-8 last:mb-0">
        <h3 className="mb-5 border-b border-border pb-3 text-base font-black">صفحه {pageIndex + 1} از {pages.length}</h3>
        {items.map((paragraph, index) => <p key={index} className="mb-4 whitespace-pre-wrap text-justify text-sm">{paragraph}</p>)}
      </section>)}
    </article>
    {canAct && <>
      <p className="flex items-center gap-2 text-xs font-bold text-muted print:hidden">{reviewed ? <><Check className="size-4 text-success" />متن قرارداد تا انتها مطالعه شد.</> : 'برای تأیید قرارداد، متن را تا انتها بخوانید.'}</p>
      <ContractActions id={contractId} templateHash={templateHash} reviewedPages={reviewed ? allPages : []} />
    </>}
    <style>{`@media print { @page { size: A4; margin: 12mm; } nav, header, aside, [data-app-navigation] { display: none !important; } .contract-print-page { break-after: page; page-break-after: always; font-size: 10pt; line-height: 1.7; } .contract-print-page:last-child { break-after: auto; page-break-after: auto; } .contract-print-page h3, .contract-print-page p { break-inside: avoid; orphans: 3; widows: 3; } }`}</style>
  </section>;
}
