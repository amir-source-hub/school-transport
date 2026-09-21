import { apiRequest } from '@/lib/api-client';

export type DriverListItem = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  nationalId: string;
  status: string;
  vehicleType: string | null;
  vehicleSystem: string | null;
  plateNumber: string | null;
  capacity: number | null;
  serviceRunCount: number;
  createdAt: string;
};
export type TransportAssignment = {
  membershipId: string;
  runId: string;
  title: string;
  direction: 'TO_SCHOOL' | 'FROM_SCHOOL';
  academicYear: string;
  scheduledStartTime: string;
  scheduledArrivalTime: string;
  activeWeekdays: number[];
  pickupOrder: number;
  schoolName: string;
  driverId: string;
  driverFirstName: string;
  driverLastName: string;
  driverPhoneNumber: string;
  vehicleType: string;
  vehicleSystem: string;
  plateNumber: string;
};
export type DriverDetail = {
  driver: DriverListItem & Record<string, unknown>;
  vehicle: null | Record<string, string | number | null>;
  runs: Array<{
    id: string;
    title: string;
    direction: string;
    academicYear: string;
    scheduledStartTime: string;
    scheduledArrivalTime: string;
    activeWeekdays: number[];
    areaDescription: string | null;
    contractPriceRials: number | null;
    contractDate: string | null;
    school: { id: string; name: string; schoolType: string | null };
    students: Array<{
      id: string;
      firstName: string;
      lastName: string;
      pickupOrder: number;
      seatCount: number;
      companion: null | { id: string; firstName: string; lastName: string; relationship: string };
    }>;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    mimeType: string;
    viewUrl: string;
    reviewStatus: 'ACTIVE' | 'REJECTED';
    rejectionReason: string | null;
  }>;
};
export type AdminTransportRoute = {
  id: string;
  driverId: string;
  title: string;
  direction: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
  academicYear: string;
  scheduledStartTime: string;
  scheduledArrivalTime: string;
  activeWeekdays: number[];
  areaDescription: string | null;
  contractPriceRials: number | null;
  contractDate: string | null;
  school: { id: string; name: string };
  driver: DriverListItem | null;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    address: string | null;
    pickupOrder: number;
    scheduledStopTime: string | null;
    scheduledReturnStopTime?: string | null;
    seatCount: number;
    companion: null | { id: string; firstName: string; lastName: string; relationship: string };
  }>;
};

export async function getAdminDrivers() {
  return (await apiRequest<DriverListItem[]>('/admin/drivers', { cache: 'no-store' })).data;
}
export async function getAdminDriver(id: string) {
  return (await apiRequest<DriverDetail>(`/admin/drivers/${id}`, { cache: 'no-store' })).data;
}
export async function rejectAdminDriverDocument(
  driverId: string,
  documentId: string,
  reason?: string,
) {
  return (
    await apiRequest(`/admin/drivers/${driverId}/documents/${documentId}/reject`, {
      method: 'POST',
      body: { reason },
    })
  ).data;
}
export async function updateAdminDriver(id: string, body: Record<string, string>) {
  return (await apiRequest(`/admin/drivers/${id}`, { method: 'PATCH', body })).data;
}
export async function deactivateAdminDriver(id: string) {
  return (await apiRequest(`/admin/drivers/${id}`, { method: 'DELETE' })).data;
}
export async function restoreAdminDriver(id: string) {
  return (await apiRequest(`/admin/drivers/${id}/restore`, { method: 'POST' })).data;
}
export async function permanentlyDeleteAdminDriver(id: string) {
  return (await apiRequest(`/admin/drivers/${id}/permanent`, { method: 'DELETE' })).data;
}
export async function getStudentDriverAssignments(id: string) {
  return (
    await apiRequest<TransportAssignment[]>(`/admin/students/${id}/driver-assignment`, {
      cache: 'no-store',
    })
  ).data;
}
export async function assignDriver(
  id: string,
  body: {
    driverId: string;
    academicYear: string;
    toSchoolStartTime: string;
    toSchoolArrivalTime: string;
    fromSchoolStartTime: string;
    fromSchoolArrivalTime: string;
    activeWeekdays: number[];
  },
) {
  return (await apiRequest(`/admin/students/${id}/driver-assignment`, { method: 'POST', body }))
    .data;
}
export async function getAdminTransportRoutes() {
  return (await apiRequest<AdminTransportRoute[]>('/admin/transport-routes', { cache: 'no-store' }))
    .data;
}
export async function createAdminTransportRoute(body: {
  driverId: string;
  schoolId: string;
  title: string;
  academicYear: string;
  direction: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
  scheduledStartTime: string;
  scheduledArrivalTime: string;
  areaDescription?: string;
  activeWeekdays: number[];
  contractPriceRials?: number;
  contractDate?: string;
}) {
  return (await apiRequest('/admin/transport-routes', { method: 'POST', body })).data;
}
export async function updateAdminTransportRoute(
  routeId: string,
  body: {
    driverId?: string;
    schoolId?: string;
    title?: string;
    academicYear?: string;
    direction?: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
    activeWeekdays?: number[];
    contractPriceRials?: number;
    contractDate?: string;
  },
) {
  return (await apiRequest(`/admin/transport-routes/${routeId}`, { method: 'PATCH', body })).data;
}
export async function addStudentToAdminRoute(
  routeId: string,
  body: { studentId: string; pickupOrder: number; notes?: string },
) {
  return (await apiRequest(`/admin/transport-routes/${routeId}/students`, { method: 'POST', body }))
    .data;
}
export async function removeStudentFromAdminRoute(routeId: string, studentId: string) {
  return (
    await apiRequest(`/admin/transport-routes/${routeId}/students/${studentId}`, {
      method: 'DELETE',
    })
  ).data;
}
export async function archiveAdminRoute(routeId: string) {
  return (await apiRequest(`/admin/transport-routes/${routeId}/archive`, { method: 'POST' })).data;
}
