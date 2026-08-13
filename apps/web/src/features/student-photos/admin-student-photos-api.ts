import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import { photoUploadStatusSchema } from './student-photos-api';

export const adminPhotoSchema = z.object({
  uploadId: z.string(),
  studentId: z.string().nullable(),
  status: photoUploadStatusSchema,
  version: z.number(),
  declaredMime: z.string(),
  declaredSize: z.number(),
  actualSize: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  rejectionCode: z.string().nullable(),
  rejectionDetail: z.string().nullable(),
  reviewerAdminId: z.string().nullable(),
  hasCanonical: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  student: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
});
export type AdminPhoto = z.infer<typeof adminPhotoSchema>;

const listSchema = z.array(adminPhotoSchema);

export async function getAdminPhotos(params: { page?: number; status?: string } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: '10',
  });
  if (params.status) query.set('status', params.status);
  const response = await apiRequest<unknown>(`/admin/student-photos?${query}`, {
    cache: 'no-store',
  });
  const items = listSchema.parse(response.data);
  return {
    items,
    total: response.pagination?.totalItems ?? items.length,
    page: response.pagination?.page ?? params.page ?? 1,
    pageSize: response.pagination?.pageSize ?? 10,
  };
}

export async function getAdminPhotoViewUrl(uploadId: string) {
  const response = await apiRequest<unknown>(`/admin/student-photos/${uploadId}/view-url`, {
    cache: 'no-store',
  });
  return z.object({ viewUrl: z.string().url() }).parse(response.data);
}

export async function approveAdminPhoto(uploadId: string, version: number) {
  await apiRequest(`/admin/student-photos/${uploadId}/approve`, {
    method: 'POST',
    body: { version },
  });
}

export async function rejectAdminPhoto(
  uploadId: string,
  version: number,
  reason: string,
  detail?: string,
) {
  await apiRequest(`/admin/student-photos/${uploadId}/reject`, {
    method: 'POST',
    body: { version, reason, detail: detail || undefined },
  });
}
