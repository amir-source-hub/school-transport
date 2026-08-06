import type { Metadata } from 'next';

export const SITE_NAME = 'ثمین گشت مهر ایران';
export const SITE_URL = new URL('https://samingasht.ir');

export type RouteAudience = 'public' | 'auth' | 'parent' | 'admin';

export type RouteDocumentPolicy = {
  path: string;
  audience: RouteAudience;
  title: string;
  description: string;
  primaryHeading: string;
  canonical?: string;
  redirectTo?: string;
};

export const routeDocumentPolicies: readonly RouteDocumentPolicy[] = [
  {
    path: '/',
    audience: 'public',
    title: 'مدیریت سرویس مدرسه',
    description: 'ثبت‌نام، قرارداد، پرداخت و پیگیری خدمات سرویس مدرسه برای خانواده‌ها.',
    primaryHeading: 'مسیر امن',
    canonical: '/',
  },
  {
    path: '/about',
    audience: 'public',
    title: 'درباره سامانه',
    description: 'آشنایی با رویکرد سامانه برای مدیریت شفاف خدمات سرویس مدرسه.',
    primaryHeading: 'یک مسیر یکپارچه برای خانواده و مدیریت',
    canonical: '/about',
  },
  {
    path: '/services',
    audience: 'public',
    title: 'خدمات',
    description: 'مرور مراحل ثبت درخواست، بررسی، قرارداد و پرداخت سرویس مدرسه.',
    primaryHeading: 'همه مراحل سرویس مدرسه در یک مسیر مشخص',
    canonical: '/services',
  },
  {
    path: '/registration-guide',
    audience: 'public',
    title: 'راهنمای ثبت‌نام',
    description: 'راهنمای قدم‌به‌قدم ایجاد حساب، ثبت دانش‌آموز و پیگیری درخواست سرویس.',
    primaryHeading: 'مراحل ثبت‌نام را قدم به قدم بشناسید',
    canonical: '/registration-guide',
  },
  {
    path: '/pricing',
    audience: 'public',
    title: 'قیمت‌گذاری',
    description: 'توضیح عوامل تعیین قیمت و روش‌های پرداخت خدمات سرویس مدرسه.',
    primaryHeading: 'شفافیت در هزینه‌ها، آرامش برای شما',
    canonical: '/pricing',
  },
  {
    path: '/schools',
    audience: 'public',
    title: 'مدارس',
    description: 'مشاهده و جست‌وجوی مدارس تأییدشده در ثمین گشت مهر ایران.',
    primaryHeading: 'مدرسه نزدیک شما،',
    canonical: '/schools',
  },
  {
    path: '/faq',
    audience: 'public',
    title: 'پرسش‌های متداول',
    description: 'پاسخ پرسش‌های متداول درباره ثبت‌نام، قیمت، قرارداد و پرداخت.',
    primaryHeading: 'پاسخ سوالات شما',
    canonical: '/faq',
  },
  {
    path: '/contact',
    audience: 'public',
    title: 'تماس با پشتیبانی',
    description: 'راه‌های ارتباط با پشتیبانی سامانه برای پیگیری پرسش‌ها و مشکلات.',
    primaryHeading: 'در کنار شما هستیم',
    canonical: '/contact',
  },
  {
    path: '/safety',
    audience: 'public',
    title: 'ایمنی و استانداردها',
    description: 'اصول ایمنی، بررسی مدارک و پاسخگویی در خدمات سرویس مدرسه.',
    primaryHeading: 'استانداردهای ایمنی سرویس مدرسه',
    canonical: '/safety',
  },
  {
    path: '/login',
    audience: 'auth',
    title: 'ورود یا ساخت حساب',
    description: 'ورود امن خانواده و مدیریت با کد یک‌بارمصرف.',
    primaryHeading: 'ورود یا ساخت حساب',
  },
  {
    path: '/forgot-password',
    audience: 'auth',
    title: 'ورود بدون رمز عبور',
    description: 'دریافت کد یک‌بارمصرف برای ورود امن به حساب.',
    primaryHeading: 'ورود بدون رمز عبور',
  },
  {
    path: '/register',
    audience: 'auth',
    title: 'ایجاد حساب',
    description: 'ایجاد حساب از مسیر ورود امن سامانه.',
    primaryHeading: 'ورود یا ساخت حساب',
    redirectTo: '/login',
  },
  {
    path: '/parent',
    audience: 'parent',
    title: 'پنل خانواده',
    description: 'دسترسی خانواده به خدمات دانش‌آموزان.',
    primaryHeading: 'نمای کلی خانواده',
    redirectTo: '/parent/dashboard',
  },
  {
    path: '/parent/dashboard',
    audience: 'parent',
    title: 'نمای کلی خانواده',
    description: 'مرور وضعیت دانش‌آموزان و اقدام‌های بعدی خانواده.',
    primaryHeading: 'وضعیت هر دانش‌آموز را جداگانه پیگیری کنید',
  },
  {
    path: '/parent/students',
    audience: 'parent',
    title: 'دانش‌آموزان',
    description: 'مدیریت دانش‌آموزان حساب خانواده.',
    primaryHeading: 'دانش‌آموزان',
  },
  {
    path: '/parent/students/new',
    audience: 'parent',
    title: 'ثبت دانش‌آموز',
    description: 'ادامه ثبت دانش‌آموز در فرایند ثبت‌نام.',
    primaryHeading: 'ثبت‌نام و پیگیری',
    redirectTo: '/parent/enrollments',
  },
  {
    path: '/parent/students/[studentId]',
    audience: 'parent',
    title: 'نمایه دانش‌آموز',
    description: 'مشاهده اطلاعات مجاز دانش‌آموز انتخاب‌شده.',
    primaryHeading: 'نمایه دانش‌آموز',
  },
  {
    path: '/parent/enrollments',
    audience: 'parent',
    title: 'ثبت‌نام و پیگیری',
    description: 'ثبت و پیگیری درخواست‌های سرویس دانش‌آموزان.',
    primaryHeading: 'ثبت‌نام و پیگیری',
  },
  {
    path: '/parent/service-requests',
    audience: 'parent',
    title: 'درخواست خدمت',
    description: 'ادامه درخواست خدمت در بخش ثبت‌نام.',
    primaryHeading: 'ثبت‌نام و پیگیری',
    redirectTo: '/parent/enrollments',
  },
  {
    path: '/parent/profile',
    audience: 'parent',
    title: 'اطلاعات خانواده',
    description: 'مشاهده و ویرایش اطلاعات مجاز خانواده.',
    primaryHeading: 'اطلاعات خانواده',
  },
  {
    path: '/parent/notifications',
    audience: 'parent',
    title: 'اعلان‌ها',
    description: 'مشاهده پیام‌ها و اعلان‌های حساب خانواده.',
    primaryHeading: 'اعلان‌ها',
  },
  {
    path: '/parent/payments',
    audience: 'parent',
    title: 'پرداخت‌ها و اقساط',
    description: 'مشاهده پیش‌پرداخت، اقساط و وضعیت تراکنش‌ها.',
    primaryHeading: 'پرداخت‌ها و اقساط',
  },
  {
    path: '/parent/contracts',
    audience: 'parent',
    title: 'قراردادها',
    description: 'مشاهده و اقدام روی قراردادهای دانش‌آموزان.',
    primaryHeading: 'قراردادها',
  },
  {
    path: '/parent/contracts/[contractId]',
    audience: 'parent',
    title: 'جزئیات قرارداد',
    description: 'مشاهده نسخه و وضعیت قرارداد انتخاب‌شده.',
    primaryHeading: 'جزئیات قرارداد',
  },
  {
    path: '/admin',
    audience: 'admin',
    title: 'پنل مدیریت',
    description: 'دسترسی به عملیات مدیریت سامانه.',
    primaryHeading: 'داشبورد مدیریت',
    redirectTo: '/admin/dashboard',
  },
  {
    path: '/admin/dashboard',
    audience: 'admin',
    title: 'داشبورد مدیریت',
    description: 'مرور وضعیت عملیاتی سامانه.',
    primaryHeading: 'داشبورد مدیریت',
  },
  {
    path: '/admin/admins',
    audience: 'admin',
    title: 'مدیران سامانه',
    description: 'مدیریت حساب‌های مدیران سامانه.',
    primaryHeading: 'مدیران سامانه',
  },
  {
    path: '/admin/contracts',
    audience: 'admin',
    title: 'قراردادها',
    description: 'بررسی و صدور قراردادهای سرویس.',
    primaryHeading: 'قراردادها',
  },
  {
    path: '/admin/families',
    audience: 'admin',
    title: 'خانواده‌ها',
    description: 'مشاهده و مدیریت حساب‌های خانواده.',
    primaryHeading: 'خانواده‌ها',
  },
  {
    path: '/admin/families/[familyId]',
    audience: 'admin',
    title: 'جزئیات خانواده',
    description: 'مشاهده اطلاعات مجاز خانواده انتخاب‌شده.',
    primaryHeading: 'جزئیات خانواده',
  },
  {
    path: '/admin/notifications',
    audience: 'admin',
    title: 'اعلان‌ها',
    description: 'مدیریت اعلان‌های عملیاتی سامانه.',
    primaryHeading: 'اعلان‌ها',
  },
  {
    path: '/admin/payments',
    audience: 'admin',
    title: 'پرداخت‌ها',
    description: 'بررسی و مدیریت وضعیت پرداخت‌ها.',
    primaryHeading: 'پرداخت‌ها',
  },
  {
    path: '/admin/registrations',
    audience: 'admin',
    title: 'درخواست‌های ثبت‌نام',
    description: 'بررسی صف درخواست‌های ثبت‌نام.',
    primaryHeading: 'درخواست‌های ثبت‌نام',
  },
  {
    path: '/admin/registrations/[registrationId]',
    audience: 'admin',
    title: 'بررسی درخواست ثبت‌نام',
    description: 'بررسی اطلاعات درخواست ثبت‌نام انتخاب‌شده.',
    primaryHeading: 'بررسی درخواست ثبت‌نام',
  },
  {
    path: '/admin/reports',
    audience: 'admin',
    title: 'گزارش‌ها',
    description: 'مشاهده و دریافت گزارش‌های مجاز مدیریتی.',
    primaryHeading: 'گزارش جامع Excel',
  },
  {
    path: '/admin/schools',
    audience: 'admin',
    title: 'مدارس',
    description: 'مدیریت مدارس قابل انتخاب در سامانه.',
    primaryHeading: 'مدارس',
  },
  {
    path: '/admin/settings',
    audience: 'admin',
    title: 'تنظیمات',
    description: 'مشاهده تنظیمات عملیاتی مدیریت.',
    primaryHeading: 'تنظیمات مدیر',
  },
  {
    path: '/admin/students',
    audience: 'admin',
    title: 'دانش‌آموزان',
    description: 'مشاهده و مدیریت دانش‌آموزان.',
    primaryHeading: 'دانش‌آموزان',
  },
] as const;

export function metadataFor(path: string): Metadata {
  const policy = routeDocumentPolicies.find((route) => route.path === path);
  if (!policy) throw new Error(`Missing route document policy for ${path}`);

  return {
    title: policy.title,
    description: policy.description,
    ...(policy.audience === 'public'
      ? { alternates: { canonical: policy.canonical } }
      : { robots: { index: false, follow: false, noarchive: true, nosnippet: true } }),
  };
}
