'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadApiFile } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function ExportReportButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div>
      <Button
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(undefined);
          try {
            const { blob, filename } = await downloadApiFile('/admin/reports/comprehensive.xlsx');
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
          } catch (caught) {
            setError(getApiErrorFeedback(caught).message);
          } finally {
            setLoading(false);
          }
        }}
      >
        <Download aria-hidden="true" className="size-4" />
        خروجی جامع Excel
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
