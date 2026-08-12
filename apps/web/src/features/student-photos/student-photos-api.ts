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

export type PhotoUploadMode = 'panel' | 'onboarding' | 'admin';
const photoBase = (mode: PhotoUploadMode, familyId?: string) =>
  mode === 'onboarding'
    ? '/onboarding/student-photos'
    : mode === 'admin'
      ? `/admin/student-photos/families/${familyId}`
      : '/student-photos';

export async function authorizePhotoUpload(
  input: {
    studentId?: string;
    declaredMime: (typeof ACCEPTED_PHOTO_MIMES)[number];
    declaredSize: number;
  },
  mode: PhotoUploadMode = 'panel',
  familyId?: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<unknown>(`${photoBase(mode, familyId)}/uploads`, {
    method: 'POST',
    body: input,
    signal,
    timeoutMs: 20_000,
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
    const cleanup = () => options.signal?.removeEventListener('abort', abort);
    request.open('PUT', uploadUrl);
    request.timeout = 60_000;
    request.setRequestHeader('Content-Type', file.type);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable)
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`PHOTO_UPLOAD_HTTP_${request.status}`));
    });
    request.addEventListener('error', () => {
      cleanup();
      reject(new Error('PHOTO_UPLOAD_NETWORK'));
    });
    request.addEventListener('timeout', () => {
      cleanup();
      reject(new Error('PHOTO_UPLOAD_TIMEOUT'));
    });
    request.addEventListener('abort', () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    });
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    else request.send(file);
  });
}

export async function completePhotoUpload(
  uploadId: string,
  mode: PhotoUploadMode = 'panel',
  familyId?: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<unknown>(`${photoBase(mode, familyId)}/uploads/${uploadId}/complete`, {
    method: 'POST',
    signal,
    timeoutMs: 20_000,
  });
  return photoUploadViewSchema.parse(response.data);
}

export async function linkPhotoUpload(
  uploadId: string,
  studentId: string,
  mode: PhotoUploadMode = 'panel',
) {
  await apiRequest(`${photoBase(mode)}/uploads/${uploadId}/link`, {
    method: 'POST',
    body: { studentId },
  });
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
