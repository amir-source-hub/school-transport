import { apiRequest } from '@/lib/api-client';

export type DriverListItem = {
  id: string; firstName: string; lastName: string; phoneNumber: string; nationalId: string;
  status: string; vehicleType: string | null; vehicleSystem: string | null; plateNumber: string | null;
  capacity: number | null; serviceRunCount: number;
};
export type TransportAssignment = {
  membershipId: string; runId: string; title: string; direction: 'TO_SCHOOL' | 'FROM_SCHOOL';
  academicYear: string; scheduledStartTime: string; scheduledArrivalTime: string; activeWeekdays: number[];
  pickupOrder: number; schoolName: string; driverId: string; driverFirstName: string;
  driverLastName: string; driverPhoneNumber: string; vehicleType: string; vehicleSystem: string; plateNumber: string;
};
export type DriverDetail = {
  driver: DriverListItem & Record<string, unknown>;
  vehicle: null | Record<string, string | number | null>;
  runs: Array<{ id: string; title: string; direction: string; academicYear: string; scheduledStartTime: string; scheduledArrivalTime: string; school: { id: string; name: string }; students: Array<{ id: string; firstName: string; lastName: string; pickupOrder: number }> }>;
  documents: Array<{ id: string; documentType: string; mimeType: string; viewUrl: string }>;
};

export async function getAdminDrivers() { return (await apiRequest<DriverListItem[]>('/admin/drivers', { cache: 'no-store' })).data; }
export async function getAdminDriver(id: string) { return (await apiRequest<DriverDetail>(`/admin/drivers/${id}`, { cache: 'no-store' })).data; }
export async function getStudentDriverAssignments(id: string) { return (await apiRequest<TransportAssignment[]>(`/admin/students/${id}/driver-assignment`, { cache: 'no-store' })).data; }
export async function assignDriver(id: string, body: { driverId: string; academicYear: string; toSchoolStartTime: string; toSchoolArrivalTime: string; fromSchoolStartTime: string; fromSchoolArrivalTime: string; activeWeekdays: number[] }) {
  return (await apiRequest(`/admin/students/${id}/driver-assignment`, { method: 'POST', body })).data;
}
