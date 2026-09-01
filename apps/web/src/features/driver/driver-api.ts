import { apiRequest } from '@/lib/api-client';
import { DIRECT_UPLOAD_RETRY_MESSAGE, putFileDirectly } from '@/lib/direct-object-upload';

export type DriverRecord = { [key:string]: unknown; firstName:string;lastName:string;fatherName:string;nationalId:string;phoneNumber:string;secondaryPhoneNumber:string|null;homePhoneNumber:string|null;emergencyPhoneNumber:string;gender:string;education:string;licenseExpiresAt:string;streetAddress:string;postalCode:string;province:string;city:string;municipalityDistrict:string;referrerName:string|null;referrerPhoneNumber:string|null;status:string };
export type VehicleRecord = { [key:string]: unknown; vehicleType:string;system:string;modelYear:number;plateNumber:string;usageType:string;ownershipType:string;insuranceExpiresAt:string;technicalInspectionExpiresAt:string };
export type DriverProfile = { driver: DriverRecord; vehicle: VehicleRecord | null };
export type DriverRun = { id:string; title:string; direction:string; sequenceNumber:number; scheduledStartTime:string; scheduledArrivalTime:string; areaDescription:string|null; activeWeekdays:number[]; schoolName:string; students:Array<{id:string;firstName:string;lastName:string;grade:string|null;pickupOrder:number}> };
export type AssignedStudent = { id:string;firstName:string;lastName:string;fatherName:string|null;grade:string|null;className:string|null;schoolName:string;guardianPhone:string|null;guardianName:string;address:string|null;district:string|null;latitude:number|null;longitude:number|null;assignments:Array<{runTitle:string;direction:string;pickupOrder:number}> };
export type DriverDocument = { id:string;documentType:'DRIVER_PHOTO'|'VEHICLE_PHOTO';mimeType:string;createdAt:string;viewUrl:string };
export type DriverDashboard = { driver:{firstName:string;lastName:string;status:string};vehicle:VehicleRecord|null;counts:{serviceRuns:number;students:number;images:number};runs:DriverRun[];expiries:Array<{label:string;date:string;expired:boolean}> };

export async function getDriverDashboard(){ return (await apiRequest<DriverDashboard>('/driver/dashboard',{cache:'no-store'})).data; }
export async function getDriverProfile(){ return (await apiRequest<DriverProfile>('/driver/me',{cache:'no-store'})).data; }
export async function updateDriverProfile(body:Record<string,string>){ return (await apiRequest<DriverProfile>('/driver/me',{method:'PATCH',body})).data; }
export async function getDriverRuns(){ return (await apiRequest<DriverRun[]>('/driver/service-runs',{cache:'no-store'})).data; }
export async function getDriverStudents(){ return (await apiRequest<AssignedStudent[]>('/driver/students',{cache:'no-store'})).data; }
export async function getDriverDocuments(){ return (await apiRequest<DriverDocument[]>('/driver/documents',{cache:'no-store'})).data; }
export async function replaceDriverDocument(file:File,documentType:'DRIVER_PHOTO'|'VEHICLE_PHOTO'){
  const mimeType=file.type==='image/png'?'image/png':'image/jpeg';
  const auth=await apiRequest<{uploadId:string;uploadUrl:string}>('/driver/documents/uploads',{method:'POST',body:{documentType,mimeType,size:file.size}});
  await putFileDirectly(auth.data.uploadUrl,file,{contentType:mimeType,fallbackPath:'/api/private-object-upload'}).catch(()=>{throw new Error(DIRECT_UPLOAD_RETRY_MESSAGE)});
  await apiRequest(`/driver/documents/uploads/${auth.data.uploadId}/replace`,{method:'POST'});
}
