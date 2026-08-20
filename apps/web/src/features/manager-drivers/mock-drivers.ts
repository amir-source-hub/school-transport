export type MockDocument = { title: string; pages: string[] };
export type MockRoute = {
  title: string; schoolName: string; direction: 'TO_SCHOOL' | 'FROM_SCHOOL';
  sequenceNumber: number; scheduledStartTime: string; scheduledArrivalTime: string;
  area: string; students: string[];
};
export type MockDriver = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  nationalId: string;
  education: string;
  fatherName: string;
  gender: string;
  licenseExpiresAt: string;
  vehicleType: string;
  system: string;
  vehicleYear: number;
  plate: string;
  vehicleStatus: string;
  insuranceExpiresAt: string;
  technicalInspectionExpiresAt: string;
  capacity: number;
  routes: MockRoute[];
  driverDocuments: MockDocument[];
  vehicleDocuments: MockDocument[];
};
const image = '/samin-gasht-logo.png';
const make = (id: string, firstName: string, lastName: string, offset: number): MockDriver => ({
  id,
  firstName,
  lastName,
  phoneNumber: `0912123456${offset}`,
  nationalId: `001354039${offset}`,
  education: 'دیپلم',
  fatherName: 'محمد',
  gender: offset === 1 ? 'زن' : 'مرد',
  licenseExpiresAt: '۱۴۰۶/۰۶/۳۱',
  vehicleType: offset === 2 ? 'مینی‌بوس' : 'ون',
  system: 'تویوتا هایس',
  vehicleYear: 1402 + offset,
  plate: `ایران ۱۱ ـ ۴۲${offset} ع ۷۷`,
  vehicleStatus: 'فعال و تأییدشده',
  capacity: 4,
  insuranceExpiresAt: '۱۴۰۵/۰۹/۱۰',
  technicalInspectionExpiresAt: '۱۴۰۵/۰۵/۰۵',
  routes: [
    { title: 'سرویس رفت ۱', schoolName: 'دبستان اندیشه روشن', direction: 'TO_SCHOOL', sequenceNumber: 1, scheduledStartTime: '۰۶:۳۰', scheduledArrivalTime: '۰۶:۵۰', area: 'محدوده مرکزی', students: ['علی احمدی', 'سارا محمدی', 'آرین رضایی', 'نورا کریمی'] },
    { title: 'سرویس رفت ۲', schoolName: 'دبستان اندیشه روشن', direction: 'TO_SCHOOL', sequenceNumber: 2, scheduledStartTime: '۰۶:۵۰', scheduledArrivalTime: '۰۷:۱۰', area: 'محدوده شمالی', students: ['امیرحسین مرادی', 'یسنا حسینی', 'محمد پارسا', 'هانا اکبری'] },
    { title: 'سرویس رفت ۳', schoolName: 'دبستان اندیشه روشن', direction: 'TO_SCHOOL', sequenceNumber: 3, scheduledStartTime: '۰۷:۱۰', scheduledArrivalTime: '۰۷:۳۰', area: 'محدوده غربی', students: ['کیانا نوروزی', 'سامیار امینی', 'رها محمودی', 'طاها جعفری'] },
    { title: 'سرویس برگشت ۱', schoolName: 'دبستان اندیشه روشن', direction: 'FROM_SCHOOL', sequenceNumber: 1, scheduledStartTime: '۱۲:۰۰', scheduledArrivalTime: '۱۲:۲۰', area: 'محدوده مرکزی', students: ['علی احمدی', 'سارا محمدی', 'آرین رضایی', 'نورا کریمی'] },
    { title: 'سرویس برگشت ۲', schoolName: 'دبستان اندیشه روشن', direction: 'FROM_SCHOOL', sequenceNumber: 2, scheduledStartTime: '۱۳:۰۰', scheduledArrivalTime: '۱۳:۲۰', area: 'محدوده شمالی', students: ['امیرحسین مرادی', 'یسنا حسینی', 'محمد پارسا', 'هانا اکبری'] },
    { title: 'سرویس برگشت ۳', schoolName: 'دبستان اندیشه روشن', direction: 'FROM_SCHOOL', sequenceNumber: 3, scheduledStartTime: '۱۴:۰۰', scheduledArrivalTime: '۱۴:۲۰', area: 'محدوده غربی', students: ['کیانا نوروزی', 'سامیار امینی', 'رها محمودی', 'طاها جعفری'] },
  ],
  driverDocuments: [
    { title: 'عکس راننده', pages: [image] },
    { title: 'کارت ملی (پشت و رو)', pages: [image, image] },
    { title: 'گواهینامه', pages: [image] },
    { title: 'گواهی سوء پیشینه', pages: [image, image] },
    { title: 'گواهی عدم اعتیاد', pages: [image] },
  ],
  vehicleDocuments: [
    { title: 'عکس خودرو', pages: [image] },
    { title: 'کارت ماشین (پشت و رو)', pages: [image, image] },
    { title: 'برگ سبز', pages: [image] },
    { title: 'معاینه فنی', pages: [image] },
    { title: 'بیمه‌نامه', pages: [image, image] },
  ],
});
export const mockDrivers = [
  make('preview-arya', 'آریا', 'نیک‌راه', 0),
  make('preview-sahar', 'سحر', 'راهنما', 1),
  make('preview-kian', 'کیان', 'هم‌مسیر', 2),
];
