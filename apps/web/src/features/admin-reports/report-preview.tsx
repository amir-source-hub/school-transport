'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { formatIrr, formatJalaliDate, formatPersianNumber } from '@/lib/formatters';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  getReportPreview,
  reportSections,
  type ReportPreview,
  type ReportSection,
} from './report-preview-api';

export function ReportPreviewPanel() {
  const [section, setSection] = useState<ReportSection>('students');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<ReportPreview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getReportPreview(section, page)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((caught) => {
        if (active) setError(getApiErrorFeedback(caught).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, requestVersion, section]);

  const formatValue = (value: unknown, kind?: 'money' | 'date') => {
    if (value === null || value === undefined || value === '') return '—';
    if (kind === 'money' && typeof value === 'number') return formatIrr(value);
    if (kind === 'date') return formatJalaliDate(String(value));
    return String(value);
  };

  return (
    <Card className="space-y-5" aria-label="پیش‌نمایش گزارش جامع">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full max-w-sm text-sm font-bold">
          بخش گزارش
          <Select
            className="mt-2"
            value={section}
            onValueChange={(value) => {
              setLoading(true);
              setError(undefined);
              setSection(value as ReportSection);
              setPage(1);
            }}
            options={[...reportSections]}
          />
        </label>
        {preview && !loading && (
          <p className="text-sm text-muted">
            {formatPersianNumber(preview.pagination.total)} ردیف
          </p>
        )}
      </div>

      {loading && (
        <div role="status" aria-label="در حال دریافت پیش‌نمایش" className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {!loading && error && (
        <ErrorState
          description={error}
          action={<Button onClick={() => { setLoading(true); setError(undefined); setRequestVersion((value) => value + 1); }}>تلاش دوباره</Button>}
        />
      )}
      {!loading && !error && preview?.rows.length === 0 && (
        <p className="rounded-xl bg-surface-muted p-8 text-center text-sm text-muted">
          داده‌ای برای نمایش در این بخش وجود ندارد.
        </p>
      )}
      {!loading && !error && preview && preview.rows.length > 0 && (
        <>
          <div className="space-y-3 md:hidden">
            {preview.rows.map((row, index) => (
              <div key={index} className="rounded-xl border border-border p-4">
                <dl className="space-y-2">
                  {preview.columns.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="font-bold text-muted">{column.label}</dt>
                      <dd className="text-left font-medium">{formatValue(row[column.key], column.kind)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block" role="region" aria-label="جدول پیش‌نمایش گزارش" tabIndex={0}>
            <table className="w-full min-w-[48rem] text-sm">
              <thead><tr className="border-b border-border bg-surface-muted">{preview.columns.map((column) => <th key={column.key} className="px-3 py-3 text-right font-black">{column.label}</th>)}</tr></thead>
              <tbody>{preview.rows.map((row, index) => <tr key={index} className="border-b border-border/60">{preview.columns.map((column) => <td key={column.key} className="px-3 py-3">{formatValue(row[column.key], column.kind)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {Object.keys(preview.totals).length > 0 && (
            <div className="flex flex-wrap gap-4 rounded-xl bg-primary-soft p-4 text-sm">
              {Object.entries(preview.totals).map(([key, value]) => (
                <p key={key}><span className="font-bold">جمع {preview.columns.find((column) => column.key === key)?.label}:</span> {formatIrr(value)}</p>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>صفحه قبل</Button>
            <span className="text-sm text-muted">صفحه {formatPersianNumber(page)} از {formatPersianNumber(preview.pagination.totalPages)}</span>
            <Button variant="secondary" disabled={page >= preview.pagination.totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>صفحه بعد</Button>
          </div>
        </>
      )}
    </Card>
  );
}
