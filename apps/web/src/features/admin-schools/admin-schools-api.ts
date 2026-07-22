import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  schoolType: z.string(),
  genderType: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  status: z.string().optional(),
});

export const schoolsSchema = z.array(schoolSchema);

export type AdminSchool = z.infer<typeof schoolSchema>;

const fallbackSchools: AdminSchool[] = [
  { id: 'sch-001', name: 'مدرسه امید', schoolType: 'دولتی', genderType: 'مختلط', province: 'تهران', city: 'تهران', district: 'منطقه ۳', address: 'خیابان ولیعصر، پلاک ۱۲۳', phoneNumber: '۰۲۱۱۲۳۴۵۶۷۸', status: 'فعال' },
  { id: 'sch-002', name: 'مدرسه دانش', schoolType: 'دولتی', genderType: 'دخترانه', province: 'تهران', city: 'تهران', district: 'منطقه ۲', address: 'خیابان شریعتی، پلاک ۴۵', phoneNumber: '۰۲۱۸۷۶۵۴۳۲۱', status: 'فعال' },
  { id: 'sch-003', name: 'مدرسه فرهنگ', schoolType: 'غیردولتی', genderType: 'مختلط', province: 'تهران', city: 'تهران', district: 'منطقه ۱', address: 'بلوار میرداماد، پلاک ۷۸', phoneNumber: '۰۲۱۲۲۳۳۴۴۵۵', status: 'فعال' },
  { id: 'sch-004', name: 'مدرسه نور', schoolType: 'دولتی', genderType: 'پسرانه', province: 'تهران', city: 'تهران', district: 'منطقه ۵', address: 'خیابان آزادی، پلاک ۹۰', phoneNumber: null, status: 'غیرفعال' },
];

export async function getAdminSchools(): Promise<{ schools: AdminSchool[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/schools', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { schools: schoolsSchema.parse(response.data) };
  } catch {
    return { schools: fallbackSchools };
  }
}
