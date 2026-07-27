import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const parentSchema = z.object({
  id: z.string(),
  parentType: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  phoneNumber: z.string(),
  isPrimaryContact: z.boolean(),
  phoneVerified: z.boolean(),
});
const addressSchema = z.object({
  id: z.string(),
  title: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string().optional(),
  streetAddress: z.string(),
  postalCode: z.string().optional(),
  isActive: z.boolean(),
});
const emergencySchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.string(),
  phoneNumber: z.string(),
  isActive: z.boolean(),
});
export const familyProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  mother: parentSchema.nullable(),
  father: parentSchema.nullable(),
  addresses: z.array(addressSchema),
  emergencyContacts: z.array(emergencySchema),
});
export type FamilyProfile = z.infer<typeof familyProfileSchema>;

export async function getFamilyProfile() {
  const response = await apiRequest<unknown>('/families/me', { cache: 'no-store' });
  return familyProfileSchema.parse(response.data);
}
export async function updateParent(
  parentType: 'MOTHER' | 'FATHER',
  data: { firstName: string; lastName: string; nationalId: string; phoneNumber: string },
) {
  await apiRequest('/families/me', { method: 'PATCH', body: { parentType, ...data } });
}
export async function updateAddress(id: string, data: Record<string, string>) {
  await apiRequest(`/families/addresses/${id}`, { method: 'PATCH', body: data });
}
export async function updateEmergencyContact(id: string, data: Record<string, string>) {
  await apiRequest(`/families/emergency-contacts/${id}`, { method: 'PATCH', body: data });
}
export async function completeFamilyRegistration(data: Record<string, unknown>) {
  await apiRequest('/families/complete-registration', { method: 'POST', body: data });
}
