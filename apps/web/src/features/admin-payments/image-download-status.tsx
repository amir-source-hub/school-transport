'use client';

import { useSyncExternalStore } from 'react';
import { imageDownloadManager } from './image-download-manager';

export function ImageDownloadStatus() {
  const state = useSyncExternalStore(imageDownloadManager.subscribe, imageDownloadManager.getSnapshot, imageDownloadManager.getSnapshot);
  if (state.status === 'idle') return null;
  const percent = state.total ? Math.min(100, Math.round(state.loaded / state.total * 100)) : null;
  const label = state.kind === 'photos' ? 'عکس‌های دانش‌آموزان' : state.kind === 'receipts' ? 'تصاویر رسیدها' : 'مدارک رانندگان';
  return <aside className="fixed bottom-4 left-4 right-4 z-50 max-w-sm rounded-xl border border-border bg-white p-4 shadow-xl sm:right-auto" role="status" aria-live="polite">
    <p className="font-bold">دریافت {label}</p>
    {state.status === 'downloading' ? <>
      <div role="progressbar" aria-label="پیشرفت دریافت" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full bg-primary ${percent == null ? 'w-1/3 animate-pulse' : ''}`} style={percent == null ? undefined : { width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{percent == null ? `${(state.loaded / 1024 / 1024).toFixed(1)} مگابایت دریافت شده` : `${percent.toLocaleString('fa-IR')}٪`}</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg border border-border px-4 text-sm font-bold" onClick={imageDownloadManager.cancel}>لغو دریافت</button>
    </> : <>
      <p className="mt-2 text-sm">{state.status === 'complete' ? 'فایل آماده شد و به مرورگر تحویل داده شد.' : state.status === 'cancelled' ? 'دریافت لغو شد.' : state.error}</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg border border-border px-4 text-sm font-bold" onClick={imageDownloadManager.dismiss}>بستن</button>
    </>}
  </aside>;
}
