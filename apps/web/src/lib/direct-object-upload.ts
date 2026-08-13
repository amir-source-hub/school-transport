export type DirectUploadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (percent: number | null) => void;
};

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
      else reject(new Error(`DIRECT_UPLOAD_HTTP_${request.status}`));
    };
    request.onerror = () => {
      cleanup();
      reject(new TypeError('DIRECT_UPLOAD_NETWORK'));
    };
    request.ontimeout = () => {
      cleanup();
      reject(new DOMException('Direct upload timed out', 'TimeoutError'));
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
  'ارسال تصویر کامل نشد. از پایداری اینترنت مطمئن شوید، کمی صبر کنید و دوباره تلاش کنید.';
