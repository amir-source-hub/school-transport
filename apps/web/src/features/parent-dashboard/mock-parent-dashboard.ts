export type DemoStudentDashboard = {
  id: string;
  name: string;
  schoolAndGrade: string;
  academicYear: string;
  enrollmentStatus: string;
  enrollmentTone: 'warning' | 'danger';
  nextAction: string;
  contractStatus: string;
  paymentSummary: string;
  nextPayment: string;
  warning: string | null;
  notifications: readonly string[];
};

export const demoStudentDashboards: readonly DemoStudentDashboard[] = [
  {
    id: 'demo-student-one',
    name: 'دانش‌آموز نمونه یک',
    schoolAndGrade: 'مدرسه و پایه پس از اتصال داده نمایش داده می‌شود',
    academicYear: 'سال تحصیلی نمونه',
    enrollmentStatus: 'در حال بررسی',
    enrollmentTone: 'warning',
    nextAction: 'منتظر نتیجه بررسی مدیریت بمانید.',
    contractStatus: 'هنوز صادر نشده',
    paymentSummary: 'برنامه پرداخت هنوز ایجاد نشده',
    nextPayment: 'پس از تعیین قیمت و پذیرش قرارداد مشخص می‌شود',
    warning: null,
    notifications: ['درخواست نمونه برای بررسی ارسال شده است.'],
  },
  {
    id: 'demo-student-two',
    name: 'دانش‌آموز نمونه دو',
    schoolAndGrade: 'مدرسه و پایه پس از اتصال داده نمایش داده می‌شود',
    academicYear: 'سال تحصیلی نمونه',
    enrollmentStatus: 'نیازمند اصلاح',
    enrollmentTone: 'danger',
    nextAction: 'موارد بازگشتی را بررسی و فقط بخش‌های درخواست‌شده را اصلاح کنید.',
    contractStatus: 'هنوز صادر نشده',
    paymentSummary: 'برنامه پرداخت هنوز ایجاد نشده',
    nextPayment: 'هنوز سررسیدی ثبت نشده است',
    warning: 'این درخواست برای اصلاح به خانواده بازگردانده شده است.',
    notifications: ['درخواست نمونه نیازمند اصلاح است.', 'جزئیات اصلاح از API دریافت خواهد شد.'],
  },
];
