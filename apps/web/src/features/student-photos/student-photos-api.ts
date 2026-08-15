import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import { putFileDirectly } from '@/lib/direct-object-upload';

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
  options: {
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
    contentType?: (typeof ACCEPTED_PHOTO_MIMES)[number];
  } = {},
) {
  await putFileDirectly(uploadUrl, file, {
    signal: options.signal,
    contentType: options.contentType,
    fallbackPath: '/api/student-photo-upload',
    onProgress: (percent) => options.onProgress?.(percent ?? 0),
  });
}

export async function completePhotoUpload(
  uploadId: string,
  mode: PhotoUploadMode = 'panel',
  familyId?: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<unknown>(
    `${photoBase(mode, familyId)}/uploads/${uploadId}/complete`,
    {
      method: 'POST',
      signal,
      timeoutMs: 20_000,
    },
  );
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
