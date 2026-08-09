import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const ACCEPTED_PHOTO_MIMES = ['image/jpeg', 'image/png'] as const;

export const photoUploadStatusSchema = z.enum([
  'AUTHORIZED',
  'UPLOADED',
  'VALIDATING',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'EXPIRED',
  'SUPERSEDED',
]);

export type PhotoUploadStatus = z.infer<typeof photoUploadStatusSchema>;

export const photoUploadViewSchema = z.object({
  uploadId: z.string(),
  studentId: z.string().nullable(),
  status: photoUploadStatusSchema,
  rejectionCode: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PhotoUploadView = z.infer<typeof photoUploadViewSchema>;

export const authorizePhotoUploadSchema = z.object({
  uploadId: z.string(),
  objectKey: z.string(),
  uploadUrl: z.string(),
  expiresInSeconds: z.number(),
  acceptedFormats: z.array(z.string()),
  maxBytes: z.number(),
  status: photoUploadStatusSchema,
});

export type AuthorizePhotoUpload = z.infer<typeof authorizePhotoUploadSchema>;

export const photoViewUrlSchema = z.object({
  uploadId: z.string(),
  status: photoUploadStatusSchema,
  viewUrl: z.string(),
  expiresInSeconds: z.number(),
});

export type PhotoViewUrl = z.infer<typeof photoViewUrlSchema>;

export async function authorizePhotoUpload(input: {
  studentId?: string;
  declaredMime: (typeof ACCEPTED_PHOTO_MIMES)[number];
  declaredSize: number;
}) {
  const response = await apiRequest<unknown>('/student-photos/uploads', {
    method: 'POST',
    body: input,
  });
  return authorizePhotoUploadSchema.parse(response.data);
}

export async function putPhotoObject(
  uploadUrl: string,
  file: File,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable)
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      options.signal?.removeEventListener('abort', abort);
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`PHOTO_UPLOAD_HTTP_${request.status}`));
    });
    request.addEventListener('error', () => reject(new Error('PHOTO_UPLOAD_NETWORK')));
    request.addEventListener('abort', () =>
      reject(new DOMException('Upload cancelled', 'AbortError')),
    );
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    else request.send(file);
  });
}

export async function completePhotoUpload(uploadId: string) {
  const response = await apiRequest<unknown>(`/student-photos/uploads/${uploadId}/complete`, {
    method: 'POST',
  });
  return photoUploadViewSchema.parse(response.data);
}

export async function getMyPhotoUploads(studentId?: string) {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  const response = await apiRequest<unknown>(`/student-photos/current${query}`, {
    cache: 'no-store',
  });
  return z.array(photoUploadViewSchema).parse((response.data as { items: unknown[] }).items);
}

export async function getPhotoViewUrl(uploadId: string) {
  const response = await apiRequest<unknown>(`/student-photos/${uploadId}/view-url`, {
    cache: 'no-store',
  });
  return photoViewUrlSchema.parse(response.data);
}
