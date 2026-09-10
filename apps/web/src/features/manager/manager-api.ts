import { apiRequest } from '@/lib/api-client';
import { formatJalaliDate } from '@/lib/formatters';

export type ManagerDashboard = {
  school: { id: string; name: string; city: string | null; educationLevels: string[] };
  manager: {
    firstName: string;
    lastName: string;
    username: string;
    mustChangeCredentials: boolean;
  };
  counts: {
    totalStudents: number;
    activeStudents: number;
    studentsWithApprovedPhoto: number;
    studentsWithoutApprovedPhoto: number;
  };
  registrations: { byStatus: Record<string, number> };
  recentActivity: Array<{
    id: string;
    studentName: string;
    registrationStatus: string;
    serviceType: string;
    createdAt: string;
  }>;
  unansweredFeedback: number;
  onlineControlStatus: 'PREPARING';
  driverPreview: { available: boolean; experimental: boolean };
};

export type ManagerStudent = {
  id: string;
  firstName: string;
  lastName: string;
  educationLevel: string | null;
  grade: string | null;
  studentCode: string | null;
  nationalId: string | null;
  guardianName: string | null;
  isActive: boolean;
  schoolName: string;
  hasApprovedPhoto: boolean;
  createdAt: string;
  registration: null | {
    registrationStatus: string;
    serviceType: string;
    academicYear: string;
    submittedAt: string | null;
  };
};

export type ManagerStudentDetail = ManagerStudent & {
  birthDate: string | null;
  fatherName: string | null;
  gender: string | null;
  phoneNumber: string | null;
  fieldOfStudy: string | null;
  school: { id: string; name: string; schoolType: string | null };
  guardians: Array<{
    id: string;
    parentType: string;
    name: string;
    nationalId: string;
    phoneNumber: string;
    homePhone: string | null;
    relationshipType: string | null;
    relationshipDescription: string | null;
    isPrimaryContact: boolean;
  }>;
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phoneNumber: string;
    secondaryPhoneNumber: string | null;
    isActive: boolean;
  }>;
  addresses: Array<{
    id: string;
    title: string;
    province: string;
    city: string;
    district: string | null;
    streetAddress: string;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
  }>;
  enrollmentSummary: null | {
    registrationStatus: string;
    academicYear: string;
    serviceType: string;
    requestedStartDate: string | null;
    contract: null | { contractNumber: string; contractStatus: string };
    price: null | {
      totalAmount: number;
      prepaymentAmount: number;
      installmentCount: number;
      priceStatus: string;
    };
  };
  transportAssignments: Array<{ runId: string; direction: string; title: string; scheduledStartTime: string; scheduledArrivalTime: string; pickupOrder: number; driverId: string; driverFirstName: string; driverLastName: string; driverPhoneNumber: string; vehicleType: string; vehicleSystem: string; plateNumber: string }>;
};

export type ManagerDriver = { id: string; firstName: string; lastName: string; phoneNumber: string; status: string; vehicleType: string; vehicleSystem: string; plateNumber: string; capacity: number; runs: Array<{ id: string; direction: string; schoolName: string }> };
export type ManagerDriverDetail = { driver: Record<string, string | number | null>; vehicle: null | Record<string, string | number | null>; runs: Array<{ id: string; title: string; direction: string; academicYear: string; scheduledStartTime: string; scheduledArrivalTime: string; activeWeekdays: number[]; areaDescription: string | null; schoolName: string; students: Array<{ id: string; firstName: string; lastName: string; pickupOrder: number }> }> };

export type ManagerInfo = {
  manager: {
    firstName: string;
    lastName: string;
    username: string;
    phoneNumber: string;
    email: string | null;
    mustChangeCredentials: boolean;
    credentialsChangedAt: string | null;
    lastLoginAt: string | null;
  };
  schools: Array<{
    id: string;
    name: string;
    schoolType: string | null;
    genderType: string | null;
    province: string | null;
    city: string | null;
    district: string | null;
    address: string | null;
    phoneNumber: string | null;
    openingTime: string | null;
    closingTime: string | null;
    closingTimes: string[];
    latitude: number | null;
    longitude: number | null;
    educationLevels: Array<{ level: string; grades: string[] }>;
    isActive: boolean;
  }>;
  primarySchoolId: string;
};

export async function getManagerDashboard() {
  return (await apiRequest<ManagerDashboard>('/manager/dashboard')).data;
}
export async function getManagerStudents(query: string) {
  const result = await apiRequest<ManagerStudent[]>(`/manager/students?${query}`);
  return { items: result.data, total: Number(result.pagination?.totalItems ?? result.data.length) };
}
export async function getManagerStudent(id: string) {
  return (await apiRequest<ManagerStudentDetail>(`/manager/students/${id}`)).data;
}
export async function getManagerDrivers() { return (await apiRequest<ManagerDriver[]>('/manager/drivers')).data; }
export async function getManagerDriver(id: string): Promise<ManagerDriverDetail> {
  const data=(await apiRequest<ManagerDriverDetail>(`/manager/drivers/${id}`)).data;
  return {
    ...data,
    driver:{...data.driver,licenseExpiresAt:data.driver.licenseExpiresAt?formatJalaliDate(data.driver.licenseExpiresAt):data.driver.licenseExpiresAt},
    vehicle:data.vehicle?{...data.vehicle,insuranceExpiresAt:data.vehicle.insuranceExpiresAt?formatJalaliDate(data.vehicle.insuranceExpiresAt):data.vehicle.insuranceExpiresAt,technicalInspectionExpiresAt:data.vehicle.technicalInspectionExpiresAt?formatJalaliDate(data.vehicle.technicalInspectionExpiresAt):data.vehicle.technicalInspectionExpiresAt}:null,
  };
}
export async function getManagerStudentPhoto(id: string) {
  return (
    await apiRequest<{ status: 'APPROVED'; viewUrl: string; expiresInSeconds: number }>(
      `/manager/students/${id}/photo`,
    )
  ).data;
}
export async function getManagerInfo() {
  return (await apiRequest<ManagerInfo>('/manager/info')).data;
}
export async function changeManagerCredentials(body: {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
  confirmNewPassword: string;
}) {
  return (
    await apiRequest<{ mustChangeCredentials: boolean }>('/manager/settings/credentials', {
      method: 'PATCH',
      body,
    })
  ).data;
}
