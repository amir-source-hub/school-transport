import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  schoolType: z.string(),
  genderType: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  educationOptions: z.array(z.object({
    level: z.string(),
    grades: z.array(z.string()),
  })),
});

export type School = z.infer<typeof schoolSchema>;
export type SchoolsResult = { schools: School[]; source: 'api' };

export async function getSchools(): Promise<SchoolsResult> {
  const response = await apiRequest<unknown>('/schools', { cache: 'no-store', timeoutMs: 8_000 });
  return { schools: z.array(schoolSchema).parse(response.data), source: 'api' };
}
