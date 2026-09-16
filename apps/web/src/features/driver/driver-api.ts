import { apiRequest } from '@/lib/api-client';
import { DIRECT_UPLOAD_RETRY_MESSAGE, putFileDirectly } from '@/lib/direct-object-upload';
import { formatJalaliDate } from '@/lib/formatters';

export type DriverRecord = {
  [key: string]: unknown;
  firstName: string;
  lastName: string;
  fatherName: string;
  nationalId: string;
  phoneNumber: string;
  secondaryPhoneNumber: string | null;
  homePhoneNumber: string | null;
  emergencyPhoneNumber: string;
  gender: string;
  education: string;
  iban: string | null;
  cardNumber: string | null;
  bankName: string | null;
  licenseExpiresAt: string;
  streetAddress: string;
  postalCode: string;
  province: string;
  city: string;
  municipalityDistrict: string;
  referrerName: string | null;
  referrerPhoneNumber: string | null;
  status: string;
};
export type VehicleRecord = {
  [key: string]: unknown;
  vehicleType: string;
  system: string;
  modelYear: number;
  plateNumber: string;
  usageType: string;
  ownershipType: string;
  insuranceExpiresAt: string;
  technicalInspectionExpiresAt: string;
};
export type DriverProfile = { driver: DriverRecord; vehicle: VehicleRecord | null };
export type DriverRun = {
  id: string;
  title: string;
  direction: string;
  sequenceNumber: number;
  scheduledStartTime: string;
  scheduledArrivalTime: string;
  areaDescription: string | null;
  contractPriceRials: number | null;
  contractDate: string | null;
  activeWeekdays: number[];
  schoolName: string;
  schoolType: string;
  schoolAddress: string;
  schoolPhoneNumber: string | null;
  schoolLatitude: number | null;
  schoolLongitude: number | null;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: string | null;
    pickupOrder: number;
    scheduledStopTime: string | null;
    scheduledReturnStopTime?: string | null;
    notes: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    guardianPhone: string | null;
    guardianName: string;
    seatCount: number;
    companion: null | { id: string; firstName: string; lastName: string; relationship: string };
  }>;
};
export type AssignedStudent = {
  id: string;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  grade: string | null;
  className: string | null;
  schoolName: string;
  guardianPhone: string | null;
  imageUrl: string | null;
  parents: Array<{ type: string; name: string; phoneNumber: string }>;
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  assignments: Array<{ runTitle: string; direction: string; pickupOrder: number }>;
};
export type DriverDocument = {
  id: string;
  documentType: string;
  mimeType: string;
  createdAt: string;
  viewUrl: string;
  reviewStatus: 'ACTIVE' | 'REJECTED';
  rejectionReason: string | null;
};
export type DriverSchool = {
  id: string;
  name: string;
  schoolType: string;
  genderType: string;
  province: string;
  city: string;
  district: string | null;
  address: string;
  phoneNumber: string | null;
  managerName: string | null;
  managerPhone: string | null;
  openingTime: string;
  closingTime: string;
  latitude: number | null;
  longitude: number | null;
};
export type DriverDashboard = {
  driver: { firstName: string; lastName: string; status: string };
  vehicle: VehicleRecord | null;
  counts: { serviceRuns: number; students: number; images: number };
  runs: DriverRun[];
  expiries: Array<{ label: string; date: string; expired: boolean }>;
};

export async function getDriverDashboard() {
  return (await apiRequest<DriverDashboard>('/driver/dashboard', { cache: 'no-store' })).data;
}
export async function getDriverProfile() {
  const data = (await apiRequest<DriverProfile>('/driver/me', { cache: 'no-store' })).data;
  return {
    ...data,
    driver: {
      ...data.driver,
      licenseExpiresAt: data.driver.licenseExpiresAt
        ? formatJalaliDate(data.driver.licenseExpiresAt)
        : data.driver.licenseExpiresAt,
    },
  };
}
export async function updateDriverProfile(body: Record<string, string>) {
  return (await apiRequest<DriverProfile>('/driver/me', { method: 'PATCH', body })).data;
}
export async function getDriverRuns() {
  return (await apiRequest<DriverRun[]>('/driver/service-runs', { cache: 'no-store' })).data;
}
export async function getDriverStudents() {
  return (await apiRequest<AssignedStudent[]>('/driver/students', { cache: 'no-store' })).data;
}
export async function getDriverSchools() {
  return (await apiRequest<DriverSchool[]>('/driver/schools', { cache: 'no-store' })).data;
}
export async function getDriverDocuments() {
  return (await apiRequest<DriverDocument[]>('/driver/documents', { cache: 'no-store' })).data;
}
export async function replaceDriverDocument(
  file: File,
  documentType: string,
  onProgress?: (percent: number | null) => void,
) {
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const auth = await apiRequest<{ uploadId: string; uploadUrl: string }>(
    '/driver/documents/uploads',
    { method: 'POST', body: { documentType, mimeType, size: file.size } },
  );
  await putFileDirectly(auth.data.uploadUrl, file, {
    contentType: mimeType,
    fallbackPath: '/api/private-object-upload',
    onProgress,
  }).catch(() => {
    throw new Error(DIRECT_UPLOAD_RETRY_MESSAGE);
  });
  await apiRequest(`/driver/documents/uploads/${auth.data.uploadId}/replace`, { method: 'POST' });
}
