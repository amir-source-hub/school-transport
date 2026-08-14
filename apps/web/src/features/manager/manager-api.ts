import { apiRequest } from '@/lib/api-client';

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
  driverPreview: { available: boolean; experimental: true };
};

export type ManagerStudent = {
  id: string;
  firstName: string;
  lastName: string;
  educationLevel: string | null;
  grade: string | null;
  studentCode: string | null;
  nationalIdMasked: string | null;
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
  gender: string | null;
  school: { id: string; name: string; schoolType: string | null };
  guardians: Array<{ id: string; parentType: string; name: string; isPrimaryContact: boolean }>;
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
};

export type ManagerSettings = {
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
export async function getManagerSettings() {
  return (await apiRequest<ManagerSettings>('/manager/settings')).data;
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
