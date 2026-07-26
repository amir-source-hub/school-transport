import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const adminAccountSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  email: z.string().nullable(),
  status: z.string(),
  lastLoginAt: z.coerce.date().nullable(),
});

export type AdminAccount = z.infer<typeof adminAccountSchema>;

export async function getAdminAccounts() {
  const response = await apiRequest<unknown>('/admin/admins', { cache: 'no-store' });
  return z.array(adminAccountSchema).parse(response.data);
}

export async function setAdminAccountActive(id: string, active: boolean) {
  await apiRequest(`/admin/admins/${id}/${active ? 'unarchive' : 'archive'}`, { method: 'POST' });
}
