import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const studentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  schoolId: z.string(),
  schoolName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fatherName: z.string().nullable().default(null),
  nationalId: z.string(),
  birthDate: z.string().nullable(),
  gender: z.string().nullable(),
  grade: z.string().nullable(),
  className: z.string().nullable(),
  phoneNumber: z.string().nullable().default(null),
  fieldOfStudy: z.string().nullable().default(null),
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
  fatherName?: string;
  phoneNumber?: string;
  fieldOfStudy?: string;
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

export async function updateStudent(
  id: string,
  input: Pick<StudentInput, 'firstName' | 'lastName' | 'grade' | 'schoolId'> &
    Partial<
      Pick<StudentInput, 'className' | 'fatherName' | 'birthDate' | 'gender' | 'phoneNumber' | 'fieldOfStudy'>
    >,
) {
  const response = await apiRequest<unknown>(`/students/${id}`, { method: 'PATCH', body: input });
  return studentSchema.parse(response.data);
}

export const studentCapacitySchema = z.object({
  studentLimit: z.number(),
  activeStudentCount: z.number(),
  remaining: z.number(),
});

export type StudentCapacity = z.infer<typeof studentCapacitySchema>;

export async function getStudentCapacity() {
  const response = await apiRequest<unknown>('/students/capacity', { cache: 'no-store' });
  return studentCapacitySchema.parse(response.data);
}

export const limitRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  currentLimit: z.number(),
  requestedLimit: z.number(),
  reason: z.string(),
  status: z.string(),
  reviewedByAdminId: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
});

export type LimitRequest = z.infer<typeof limitRequestSchema>;

export async function getLimitRequests() {
  const response = await apiRequest<unknown>('/students/limit-requests', { cache: 'no-store' });
  return z.array(limitRequestSchema).parse(response.data);
}

export async function createLimitRequest(reason: string) {
  const response = await apiRequest<unknown>('/students/limit-requests', {
    method: 'POST',
    body: { reason },
  });
  return limitRequestSchema.parse(response.data);
}
