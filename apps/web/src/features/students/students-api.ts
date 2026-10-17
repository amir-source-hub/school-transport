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
  physicalStatus: z.string().nullable().optional(),
  disabilityType: z.string().nullable().optional(),
  grade: z.string().nullable(),
  className: z.string().nullable(),
  phoneNumber: z.string().nullable().default(null),
  fieldOfStudy: z.string().nullable().default(null),
  isActive: z.boolean(),
  seatCount: z.number().default(1),
  companion: z.object({ id:z.string(), studentId:z.string(), firstName:z.string(), lastName:z.string(), fatherName:z.string(), nationalId:z.string(), phoneNumber:z.string(), relationship:z.enum(['FAMILY','CAREGIVER','COACH']) }).nullable().default(null),
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

export type StudentDriverAssignment = {
  runId: string;
  direction: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
  title: string;
  scheduledStartTime: string;
  scheduledArrivalTime: string;
  pickupOrder: number;
  driverId: string;
  driverFirstName: string;
  driverLastName: string;
  driverPhoneNumber: string;
  vehicleType: string;
  vehicleSystem: string;
  plateNumber: string;
  documents: Array<{ documentType: string; mimeType: string; viewUrl: string }>;
};
export async function getStudentDriverAssignments(id: string) {
  return (await apiRequest<StudentDriverAssignment[]>(`/students/${id}/driver-assignments`, { cache: 'no-store' })).data;
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

export type StudentCompanionInput={firstName:string;lastName:string;fatherName:string;nationalId:string;phoneNumber:string;relationship:'FAMILY'|'CAREGIVER'|'COACH'};
export async function saveStudentCompanion(studentId:string,input:StudentCompanionInput){return (await apiRequest(`/students/${studentId}/companion`,{method:'POST',body:input})).data;}
export async function removeStudentCompanion(studentId:string){return (await apiRequest(`/students/${studentId}/companion`,{method:'DELETE'})).data;}

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
