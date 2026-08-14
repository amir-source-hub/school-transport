export type MockDriver = {
  id: string;
  name: string;
  vehicle: string;
  color: string;
  plate: string;
  capacity: number;
  assigned: number;
  route: string;
  documents: Array<{ title: string; status: 'تأیید آزمایشی' | 'در انتظار آزمایشی' }>;
};
export const mockDrivers: MockDriver[] = [
  {
    id: 'preview-arya',
    name: 'آریا نیک‌راه',
    vehicle: 'ون سپهر مدل ۱۴۰۴',
    color: 'سفید',
    plate: 'ایران ** ـ *** ع **',
    capacity: 12,
    assigned: 9,
    route: 'محدوده مرکزی',
    documents: [
      { title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' },
      { title: 'بیمه‌نامه آزمایشی', status: 'تأیید آزمایشی' },
    ],
  },
  {
    id: 'preview-sahar',
    name: 'سحر راهنما',
    vehicle: 'مینی‌بوس پارسا مدل ۱۴۰۳',
    color: 'نقره‌ای',
    plate: 'ایران ** ـ *** ب **',
    capacity: 18,
    assigned: 14,
    route: 'محدوده شمالی',
    documents: [
      { title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' },
      { title: 'معاینه فنی آزمایشی', status: 'در انتظار آزمایشی' },
    ],
  },
  {
    id: 'preview-kian',
    name: 'کیان هم‌مسیر',
    vehicle: 'سواری نمونه مدل ۱۴۰۴',
    color: 'آبی',
    plate: 'ایران ** ـ *** ج **',
    capacity: 4,
    assigned: 3,
    route: 'محدوده غربی',
    documents: [{ title: 'گواهی صلاحیت آزمایشی', status: 'تأیید آزمایشی' }],
  },
];
