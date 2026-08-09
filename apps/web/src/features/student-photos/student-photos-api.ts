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

export async function putPhotoObject(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) {
    throw new Error(`PHOTO_UPLOAD_HTTP_${response.status}`);
  }
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
