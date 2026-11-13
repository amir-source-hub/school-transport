'use client';

import { useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageDownloadManager, type ArchiveKind } from './image-download-manager';

export function ImageArchiveButton({ kind }: { kind: ArchiveKind }) {
  const state = useSyncExternalStore(imageDownloadManager.subscribe, imageDownloadManager.getSnapshot, imageDownloadManager.getSnapshot);
  const pending = state.status === 'downloading';
  return <Button type="button" variant="secondary" disabled={pending} onClick={() => void imageDownloadManager.start(kind)}><Download className="size-4" aria-hidden="true" />
      {kind === 'photos' ? 'دریافت همه عکس‌های دانش‌آموزان' : kind === 'receipts' ? 'دریافت همه تصاویر رسیدها' : 'دریافت همه مدارک و عکس‌های رانندگان'}
    </Button>;
}
