import { beforeEach, describe, expect, it, vi } from 'vitest';
import { imageDownloadManager } from './image-download-manager';
import { downloadApiFile } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({ downloadApiFile: vi.fn() }));

describe('image archive download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imageDownloadManager.dismiss();
  });

  it('keeps progress in shared state and cancels the active request', async () => {
    vi.mocked(downloadApiFile).mockImplementation((_path, options) => new Promise((_resolve, reject) => {
      options?.onProgress?.(2_000_000, 4_000_000);
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')));
    }));
    const task = imageDownloadManager.start('photos');
    expect(imageDownloadManager.getSnapshot()).toMatchObject({ status: 'downloading', loaded: 2_000_000, total: 4_000_000 });
    imageDownloadManager.cancel();
    await task;
    expect(imageDownloadManager.getSnapshot().status).toBe('cancelled');
  });
});
