export type MockDriver = {
  id: string;
  name: string;
  phoneNumber: string;
  nationalId: string;
  licenseNumber: string;
  experienceYears: number;
  vehicle: string;
  color: string;
  plate: string;
  capacity: number;
  assigned: number;
  route: string;
  vehicleYear: number;
  vin: string;
  insuranceExpiresAt: string;
  technicalInspectionExpiresAt: string;
  profileObjectUrl?: string;
  documents: Array<{
    title: string;
    status: 'تأیید آزمایشی' | 'در انتظار آزمایشی';
    objectUrl?: string;
  }>;
};
export const mockDrivers: MockDriver[] = [
  {
    id: 'preview-arya',
    name: 'آریا نیک‌راه',
    phoneNumber: '09121234567',
    nationalId: '0013540394',
    licenseNumber: '1404123456',
    experienceYears: 8,
    vehicle: 'ون سپهر مدل ۱۴۰۴',
    color: 'سفید',
    plate: 'ایران ۱۱ ـ ۴۲۱ ع ۷۷',
    capacity: 12,
    assigned: 9,
    route: 'محدوده مرکزی',
    vehicleYear: 1404,
    vin: 'IRN-SAMPLE-VAN-1404-01',
    insuranceExpiresAt: '1405/06/31',
    technicalInspectionExpiresAt: '1405/03/31',
    documents: [
      { title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' },
      { title: 'بیمه‌نامه آزمایشی', status: 'تأیید آزمایشی' },
    ],
  },
  {
    id: 'preview-sahar',
    name: 'سحر راهنما',
    phoneNumber: '09129876543',
    nationalId: '0084575948',
    licenseNumber: '1403987654',
    experienceYears: 11,
    vehicle: 'مینی‌بوس پارسا مدل ۱۴۰۳',
    color: 'نقره‌ای',
    plate: 'ایران ۲۲ ـ ۵۶۳ ب ۴۴',
    capacity: 18,
    assigned: 14,
    route: 'محدوده شمالی',
    vehicleYear: 1403,
    vin: 'IRN-SAMPLE-MINI-1403-02',
    insuranceExpiresAt: '1405/02/15',
    technicalInspectionExpiresAt: '1404/12/20',
    documents: [
      { title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' },
      { title: 'معاینه فنی آزمایشی', status: 'در انتظار آزمایشی' },
    ],
  },
  {
    id: 'preview-kian',
    name: 'کیان هم‌مسیر',
    phoneNumber: '09125554433',
    nationalId: '0499370899',
    licenseNumber: '1404554433',
    experienceYears: 5,
    vehicle: 'سواری نمونه مدل ۱۴۰۴',
    color: 'آبی',
    plate: 'ایران ۳۳ ـ ۸۱۰ ج ۲۱',
    capacity: 4,
    assigned: 3,
    route: 'محدوده غربی',
    vehicleYear: 1404,
    vin: 'IRN-SAMPLE-CAR-1404-03',
    insuranceExpiresAt: '1405/09/10',
    technicalInspectionExpiresAt: '1405/05/05',
    documents: [{ title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' }],
  },
];
