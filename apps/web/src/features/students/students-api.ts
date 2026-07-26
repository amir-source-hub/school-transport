import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const studentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  schoolId: z.string(),
  schoolName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  birthDate: z.string().nullable(),
  gender: z.string().nullable(),
  grade: z.string().nullable(),
  className: z.string().nullable(),
  isActive: z.boolean(),
});

export type Student = z.infer<typeof studentSchema>;
export type StudentInput = {
  schoolId: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate?: string;
  gender?: string;
  grade: string;
  className?: string;
};

export async function getStudents() {
  const response = await apiRequest<unknown>('/students', { cache: 'no-store' });
  return z.array(studentSchema).parse(response.data);
}

export async function getStudent(id: string) {
  const response = await apiRequest<unknown>(`/students/${id}`, { cache: 'no-store' });
  return studentSchema.parse(response.data);
}

export async function createStudent(input: StudentInput) {
  const response = await apiRequest<unknown>('/students', { method: 'POST', body: input });
  return studentSchema.parse(response.data);
}

export async function updateStudent(id: string, input: Pick<StudentInput, 'firstName' | 'lastName' | 'grade' | 'className'>) {
  const response = await apiRequest<unknown>(`/students/${id}`, { method: 'PATCH', body: input });
  return studentSchema.parse(response.data);
}

export async function archiveStudent(id: string) {
  await apiRequest(`/students/${id}`, { method: 'DELETE' });
}
