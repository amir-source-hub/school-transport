'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadApiFile } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function ImageArchiveButton({ kind }: { kind: 'photos' | 'receipts' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return <div>
    <Button type="button" variant="secondary" loading={pending} onClick={async () => {
      setPending(true); setError(undefined);
      try {
        const { blob, filename } = await downloadApiFile(`/admin/payments/images/${kind}.zip`);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (caught) { setError(getApiErrorFeedback(caught).message); }
      finally { setPending(false); }
    }}><Download className="size-4" aria-hidden="true" />
      {kind === 'photos' ? 'دریافت همه عکس‌های دانش‌آموزان' : 'دریافت همه تصاویر رسیدها'}
    </Button>
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
  </div>;
}
