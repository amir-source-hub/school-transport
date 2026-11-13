import { downloadApiFile } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export type ArchiveKind = 'photos' | 'receipts' | 'driver-documents';
type DownloadState = {
  kind: ArchiveKind | null;
  loaded: number;
  total: number | null;
  status: 'idle' | 'downloading' | 'complete' | 'cancelled' | 'error';
  error?: string;
};

let state: DownloadState = { kind: null, loaded: 0, total: null, status: 'idle' };
let controller: AbortController | null = null;
const listeners = new Set<() => void>();
const emit = (next: DownloadState) => { state = next; listeners.forEach((listener) => listener()); };

export const imageDownloadManager = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot() { return state; },
  cancel() { controller?.abort(); },
  dismiss() { if (state.status !== 'downloading') emit({ kind: null, loaded: 0, total: null, status: 'idle' }); },
  async start(kind: ArchiveKind) {
    if (controller) return;
    const current = new AbortController();
    controller = current;
    emit({ kind, loaded: 0, total: null, status: 'downloading' });
    try {
      const { blob, filename } = await downloadApiFile(`/admin/payments/images/${kind}.zip`, {
        signal: current.signal,
        onProgress: (loaded, total) => emit({ kind, loaded, total, status: 'downloading' }),
      });
      if (current.signal.aborted) {
        emit({ kind, loaded: state.loaded, total: state.total, status: 'cancelled' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      emit({ kind, loaded: blob.size, total: blob.size, status: 'complete' });
    } catch (caught) {
      emit({ kind, loaded: state.loaded, total: state.total,
        status: current.signal.aborted ? 'cancelled' : 'error',
        error: current.signal.aborted ? undefined : getApiErrorFeedback(caught).message });
    } finally {
      if (controller === current) controller = null;
    }
  },
};
