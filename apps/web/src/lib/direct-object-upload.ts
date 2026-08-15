export type DirectUploadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (percent: number | null) => void;
};

export class DirectUploadError extends Error {
  constructor(
    public readonly kind: 'network' | 'timeout' | 'http',
    public readonly status?: number,
  ) {
    super(kind === 'http' ? `DIRECT_UPLOAD_HTTP_${status}` : `DIRECT_UPLOAD_${kind.toUpperCase()}`);
    this.name = 'DirectUploadError';
  }
}

export async function putFileDirectly(
  uploadUrl: string,
  file: File,
  options: DirectUploadOptions = {},
) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => options.signal?.removeEventListener('abort', abort);
    request.open('PUT', uploadUrl);
    request.timeout = options.timeoutMs ?? 120_000;
    request.setRequestHeader('Content-Type', file.type);
    options.onProgress?.(null);
    request.upload.onprogress = (event) => {
      options.onProgress?.(
        event.lengthComputable && event.total > 0
          ? Math.round((event.loaded / event.total) * 100)
          : null,
      );
    };
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new DirectUploadError('http', request.status));
    };
    request.onerror = () => {
      cleanup();
      reject(new DirectUploadError('network'));
    };
    request.ontimeout = () => {
      cleanup();
      reject(new DirectUploadError('timeout'));
    };
    request.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    else request.send(file);
  });
}

export const DIRECT_UPLOAD_RETRY_MESSAGE =
  'ارسال تصویر به ذخیره‌گاه کامل نشد. اینترنت را بررسی کنید و دوباره تلاش کنید. اگر خطا ادامه داشت، تنظیمات CORS ذخیره‌گاه باید برای دامنه سایت و روش PUT بررسی شود.';
