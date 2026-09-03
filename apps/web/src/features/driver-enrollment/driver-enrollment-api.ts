import { apiRequest } from '@/lib/api-client';
import { DIRECT_UPLOAD_RETRY_MESSAGE, putFileDirectly } from '@/lib/direct-object-upload';
import type { DriverEnrollmentForm } from './driver-enrollment-schema';

export async function uploadDriverDocument(
  file: File,
  documentType: 'DRIVER_PHOTO' | 'VEHICLE_PHOTO',
  onProgress?: (percent: number | null) => void,
) {
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const authorized = await apiRequest<{ uploadId: string; uploadUrl: string }>('/onboarding/driver-enrollment/uploads', {
    method: 'POST', body: { documentType, mimeType, size: file.size },
  });
  await putFileDirectly(authorized.data.uploadUrl, file, {
    contentType: mimeType,
    fallbackPath: '/api/private-object-upload',
    onProgress,
  }).catch(() => {
    throw new Error(DIRECT_UPLOAD_RETRY_MESSAGE);
  });
  return authorized.data.uploadId;
}

export function buildDriverEnrollmentPayload(values: DriverEnrollmentForm) {
  const {
    locationSelected: _locationSelected,
    plateLeft,
    plateLetter,
    plateMiddle,
    plateIran,
    ...enrollment
  } = values;
  return {
    ...enrollment,
    secondaryPhoneNumber: values.secondaryPhoneNumber === '09' ? '' : values.secondaryPhoneNumber,
    modelYear: Number(values.modelYear),
    plateNumber: `${plateLeft}${plateLetter}${plateMiddle}${plateIran}`,
  };
}

export function submitDriverEnrollment(values: DriverEnrollmentForm) {
  return apiRequest('/onboarding/driver-enrollment', {
    method: 'POST',
    body: buildDriverEnrollmentPayload(values),
  });
}
