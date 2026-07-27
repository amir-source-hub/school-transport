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
export type AdminAccountInput = Pick<
  AdminAccount,
  'username' | 'firstName' | 'lastName' | 'phoneNumber'
> & { email?: string };

export async function getAdminAccounts() {
  const response = await apiRequest<unknown>('/admin/admins', { cache: 'no-store' });
  return z.array(adminAccountSchema).parse(response.data);
}

export async function setAdminAccountActive(id: string, active: boolean) {
  await apiRequest(`/admin/admins/${id}/${active ? 'unarchive' : 'archive'}`, { method: 'POST' });
}

export async function getCurrentAdminAccount() {
  const response = await apiRequest<unknown>('/admin/admins/me', { cache: 'no-store' });
  return adminAccountSchema.parse(response.data);
}

export async function createAdminAccount(input: AdminAccountInput) {
  await apiRequest('/admin/admins', { method: 'POST', body: input });
}

export async function updateAdminAccount(id: string, input: AdminAccountInput) {
  await apiRequest(`/admin/admins/${id}`, { method: 'PATCH', body: input });
}
