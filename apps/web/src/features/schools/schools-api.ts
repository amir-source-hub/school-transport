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
});

const schoolsSchema = z.array(schoolSchema);

export type School = z.infer<typeof schoolSchema>;

export type SchoolsResult = {
  schools: School[];
  source: 'api' | 'mock';
};

const fallbackSchools: School[] = [
  {
    id: 'school-demo-1',
    name: 'مدرسه نمونه یک',
    schoolType: 'PUBLIC',
    genderType: 'MIXED',
    province: 'تهران',
    city: 'تهران',
    district: 'مرکزی',
    address: 'نشانی نمایشی برای توسعه محلی',
    phoneNumber: null,
  },
  {
    id: 'school-demo-2',
    name: 'مدرسه نمونه دو',
    schoolType: 'PUBLIC',
    genderType: 'MIXED',
    province: 'تهران',
    city: 'تهران',
    district: null,
    address: 'نشانی نمایشی برای توسعه محلی',
    phoneNumber: null,
  },
];

export async function getSchools(): Promise<SchoolsResult> {
  try {
    const response = await apiRequest<unknown>('/schools', {
      cache: 'no-store',
      timeoutMs: 3_000,
    });

    return { schools: schoolsSchema.parse(response.data), source: 'api' };
  } catch {
    return { schools: fallbackSchools, source: 'mock' };
  }
}
