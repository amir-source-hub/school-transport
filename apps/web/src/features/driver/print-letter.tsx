'use client';

import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function PrintLetterButton({ label = 'چاپ نامه' }: { label?: string }) {
  return <Button type="button" onClick={() => window.print()} className="print:hidden"><Printer className="size-4" />{label}</Button>;
}

export function DownloadLetterButton({ targetId, filename }: { targetId: string; filename: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    const element = document.getElementById(targetId);
    if (!element) return;
    setBusy(true);
    setError('');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({ margin: 8, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
    } catch {
      setError('دانلود PDF انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }
  return <div className="print:hidden"><Button type="button" onClick={download} disabled={busy}><Download className="size-4" />{busy ? 'در حال ساخت PDF…' : 'دانلود PDF قرارداد'}</Button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
