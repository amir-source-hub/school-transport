export type NotificationAudience = 'STUDENT_ACCOUNT' | 'ADMIN_OPERATIONAL';
export type NotificationPurpose = 'SERVICE_NOTICE' | 'SECURITY' | 'OPTIONAL_UPDATES';
export type NotificationChannel = 'IN_APP' | 'SMS';

export interface AdminOperationalView {
  route: (context: { relatedEntityId?: string | null; userId?: string }) => string | null;
  hidesWhenResolved?: boolean;
}

export interface NotificationCatalogEntry {
  audience: NotificationAudience;
  purpose: NotificationPurpose;
  channels: NotificationChannel[];
  smsMessage: string;
  inAppTitle: string;
  inAppMessage: string;
  relatedEntityType?: string;
  route: (context: { relatedEntityId?: string | null; userId?: string }) => string | null;
  exactlyOnce: boolean;
  adminOperational?: AdminOperationalView;
}

export type NotificationType =
  | 'ACCOUNT_REGISTERED'
  | 'WELCOME'
  | 'PROFILE_UPDATED'
  | 'ADDRESS_UPDATED'
  | 'EMERGENCY_CONTACT_UPDATED'
  | 'ADMIN_STUDENT_ADDED'
  | 'LIMIT_REQUEST_CREATED'
  | 'LIMIT_REQUEST_APPROVED'
  | 'LIMIT_REQUEST_REJECTED'
  | 'ENROLLMENT_CREATED'
  | 'ENROLLMENT_UNDER_REVIEW'
  | 'ENROLLMENT_APPROVED'
  | 'ENROLLMENT_REJECTED'
  | 'ENROLLMENT_NEEDS_CORRECTION'
  | 'PRICE_OFFERED'
  | 'PRICE_ACCEPTED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_PLAN_READY'
  | 'CONTRACT_READY'
  | 'CONTRACT_ACCEPTED'
  | 'CONTRACT_REJECTED'
  | 'FEEDBACK_RESPONSE'
  | 'STUDENT_PHOTO_APPROVED'
  | 'STUDENT_PHOTO_REJECTED'
  | 'ADMIN_BROADCAST';

export type NotificationContext = {
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  userId?: string;
};

const STUDENT = '/student/dashboard';
const FINANCE = '/student/finance';
const CONTRACTS = '/student/contracts';
const STUDENTS = '/student/students';
const NOTIFICATIONS = '/student/notifications';

const studentRoute = (_context: NotificationContext) => STUDENT;
const noRoute = () => null;

export const notificationCatalog: Record<NotificationType, NotificationCatalogEntry> = {
  ACCOUNT_REGISTERED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: حساب خانواده شما ایجاد شد. ثبت‌نام سرویس را در پنل امن تکمیل کنید.',
    inAppTitle: 'ثبت‌نام حساب با موفقیت انجام شد',
    inAppMessage: 'حساب خانواده ایجاد شد و پس از پرداخت پیش‌پرداخت فعال شد.',
    relatedEntityType: 'USER',
    route: studentRoute,
    exactlyOnce: true,
  },
  WELCOME: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'OPTIONAL_UPDATES',
    channels: ['IN_APP'],
    smsMessage: 'ثمین گشت: به پنل خانواده خوش آمدید.',
    inAppTitle: 'به پنل خانواده خوش آمدید',
    inAppMessage:
      'از این بخش می‌توانید ثبت‌نام، تصمیم‌های مدیریت، قراردادها، پرداخت‌ها و سررسیدها را دنبال کنید.',
    route: studentRoute,
    exactlyOnce: true,
  },
  PROFILE_UPDATED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'OPTIONAL_UPDATES',
    channels: ['IN_APP'],
    smsMessage: 'ثمین گشت: اطلاعات حساب شما به‌روزرسانی شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'به‌روزرسانی اطلاعات حساب',
    inAppMessage: 'مشخصات حساب شما با موفقیت به‌روزرسانی شد.',
    relatedEntityType: 'PARENT',
    route: noRoute,
    exactlyOnce: false,
  },
  ADDRESS_UPDATED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'OPTIONAL_UPDATES',
    channels: ['IN_APP'],
    smsMessage: 'ثمین گشت: آدرس سرویس شما به‌روزرسانی شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'به‌روزرسانی آدرس',
    inAppMessage: 'آدرس خانواده با موفقیت به‌روزرسانی شد.',
    relatedEntityType: 'FAMILY_ADDRESS',
    route: noRoute,
    exactlyOnce: false,
  },
  EMERGENCY_CONTACT_UPDATED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'OPTIONAL_UPDATES',
    channels: ['IN_APP'],
    smsMessage: 'ثمین گشت: مخاطب اضطراری شما به‌روزرسانی شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'به‌روزرسانی مخاطب اضطراری',
    inAppMessage: 'مخاطب اضطراری با موفقیت به‌روزرسانی شد.',
    relatedEntityType: 'EMERGENCY_CONTACT',
    route: noRoute,
    exactlyOnce: false,
  },
  ADMIN_STUDENT_ADDED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: یک دانش‌آموز به حساب شما اضافه شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'افزودن دانش‌آموز توسط مدیریت',
    inAppMessage: 'مدیریت دانش‌آموزی را به حساب شما افزود.',
    relatedEntityType: 'STUDENT',
    route: studentRoute,
    exactlyOnce: false,
  },
  LIMIT_REQUEST_CREATED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: درخواست ظرفیت دانش‌آموز ثبت شد. جزئیات در پنل شماست.',
    inAppTitle: 'درخواست ظرفیت دانش‌آموز',
    inAppMessage: 'درخواست افزایش ظرفیت ثبت شد و در انتظار بررسی مدیریت است.',
    relatedEntityType: 'STUDENT_LIMIT_REQUEST',
    route: studentRoute,
    exactlyOnce: false,
    adminOperational: {
      route: () => '/admin/students',
      hidesWhenResolved: false,
    },
  },
  LIMIT_REQUEST_APPROVED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت درخواست ظرفیت دانش‌آموز تغییر کرد. جزئیات در پنل شماست.',
    inAppTitle: 'تایید درخواست ظرفیت',
    inAppMessage: 'درخواست افزایش ظرفیت دانش‌آموز تایید شد.',
    relatedEntityType: 'STUDENT_LIMIT_REQUEST',
    route: studentRoute,
    exactlyOnce: false,
  },
  LIMIT_REQUEST_REJECTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت درخواست ظرفیت دانش‌آموز تغییر کرد. جزئیات در پنل شماست.',
    inAppTitle: 'رد درخواست ظرفیت',
    inAppMessage: 'درخواست افزایش ظرفیت دانش‌آموز رد شد.',
    relatedEntityType: 'STUDENT_LIMIT_REQUEST',
    route: studentRoute,
    exactlyOnce: false,
  },
  ENROLLMENT_CREATED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'ثبت درخواست سرویس',
    inAppMessage: 'درخواست سرویس شما ثبت شد و در انتظار بررسی است.',
    relatedEntityType: 'REGISTRATION',
    route: studentRoute,
    exactlyOnce: false,
    adminOperational: {
      route: () => '/admin/enrollments',
      hidesWhenResolved: false,
    },
  },
  ENROLLMENT_UNDER_REVIEW: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'بررسی درخواست سرویس',
    inAppMessage: 'درخواست سرویس در حال بررسی است.',
    relatedEntityType: 'REGISTRATION',
    route: studentRoute,
    exactlyOnce: false,
  },
  ENROLLMENT_APPROVED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'تایید درخواست سرویس',
    inAppMessage: 'درخواست سرویس شما تایید شد.',
    relatedEntityType: 'REGISTRATION',
    route: studentRoute,
    exactlyOnce: false,
  },
  ENROLLMENT_REJECTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'رد درخواست سرویس',
    inAppMessage: 'درخواست سرویس شما رد شد.',
    relatedEntityType: 'REGISTRATION',
    route: studentRoute,
    exactlyOnce: false,
  },
  ENROLLMENT_NEEDS_CORRECTION: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'نیازمند اصلاح اطلاعات',
    inAppMessage: 'اطلاعات درخواست سرویس نیازمند اصلاح است.',
    relatedEntityType: 'REGISTRATION',
    route: studentRoute,
    exactlyOnce: false,
  },
  PRICE_OFFERED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'اعلام قیمت سرویس',
    inAppMessage: 'مدیریت قیمت سرویس را اعلام کرد. برای ادامه، قیمت را بررسی کنید.',
    relatedEntityType: 'REGISTRATION_PRICE',
    route: studentRoute,
    exactlyOnce: false,
    adminOperational: {
      route: () => '/admin/pricing',
      hidesWhenResolved: false,
    },
  },
  PRICE_ACCEPTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'پذیرش قیمت سرویس',
    inAppMessage: 'قیمت سرویس پذیرفته شد و قرارداد صادر می‌شود.',
    relatedEntityType: 'REGISTRATION_PRICE',
    route: studentRoute,
    exactlyOnce: false,
  },
  PAYMENT_SUCCEEDED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'پرداخت موفق',
    inAppMessage: 'پرداخت شما با موفقیت ثبت شد.',
    relatedEntityType: 'PAYMENT_TRANSACTION',
    route: () => FINANCE,
    exactlyOnce: false,
  },
  PAYMENT_APPROVED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'تایید پرداخت',
    inAppMessage: 'پرداخت شما توسط مدیریت تایید شد.',
    relatedEntityType: 'PAYMENT_TRANSACTION',
    route: () => FINANCE,
    exactlyOnce: false,
    adminOperational: {
      route: () => '/admin/payments',
      hidesWhenResolved: false,
    },
  },
  PAYMENT_REJECTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'رد پرداخت',
    inAppMessage: 'پرداخت شما رد شد. برای بررسی بیشتر با مدیریت تماس بگیرید.',
    relatedEntityType: 'PAYMENT_TRANSACTION',
    route: () => FINANCE,
    exactlyOnce: false,
  },
  PAYMENT_PLAN_READY: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'برنامه پرداخت آماده است',
    inAppMessage: 'برنامه پرداخت سرویس شما آماده و قابل مشاهده است.',
    relatedEntityType: 'PAYMENT_PLAN',
    route: () => FINANCE,
    exactlyOnce: false,
  },
  CONTRACT_READY: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت قرارداد سرویس تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'قرارداد آماده است',
    inAppMessage: 'قرارداد سرویس شما آماده بررسی است.',
    relatedEntityType: 'CONTRACT',
    route: () => CONTRACTS,
    exactlyOnce: false,
    adminOperational: {
      route: () => '/admin/contracts',
      hidesWhenResolved: false,
    },
  },
  CONTRACT_ACCEPTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت قرارداد سرویس تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'پذیرش قرارداد',
    inAppMessage: 'قرارداد سرویس پذیرفته شد.',
    relatedEntityType: 'CONTRACT',
    route: () => CONTRACTS,
    exactlyOnce: false,
  },
  CONTRACT_REJECTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: وضعیت قرارداد سرویس تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'رد قرارداد',
    inAppMessage: 'قرارداد سرویس رد شد.',
    relatedEntityType: 'CONTRACT',
    route: () => CONTRACTS,
    exactlyOnce: false,
  },
  FEEDBACK_RESPONSE: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: پاسخ جدیدی برای پیام شما ثبت شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'پاسخ جدید به پیام شما',
    inAppMessage: 'پاسخ مدیریت ثبت شد. برای مشاهده جزئیات وارد پنل امن شوید.',
    relatedEntityType: 'FEEDBACK',
    route: () => STUDENTS,
    exactlyOnce: true,
  },
  STUDENT_PHOTO_APPROVED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: عکس کارت سرویس دانش‌آموز تایید شد.',
    inAppTitle: 'تایید عکس کارت سرویس',
    inAppMessage: 'عکس کارت سرویس دانش‌آموز شما تایید شد.',
    relatedEntityType: 'STUDENT_PHOTO',
    route: () => STUDENTS,
    exactlyOnce: true,
  },
  STUDENT_PHOTO_REJECTED: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'SERVICE_NOTICE',
    channels: ['IN_APP', 'SMS'],
    smsMessage: 'ثمین گشت: عکس کارت سرویس دانش‌آموز نیازمند بارگذاری مجدد است.',
    inAppTitle: 'بررسی مجدد عکس کارت سرویس',
    inAppMessage: 'عکس کارت سرویس دانش‌آموز تایید نشد. برای ادامه بارگذاری، عکس جدیدی بارگذاری کنید.',
    relatedEntityType: 'STUDENT_PHOTO',
    route: () => STUDENTS,
    exactlyOnce: true,
  },
  ADMIN_BROADCAST: {
    audience: 'STUDENT_ACCOUNT',
    purpose: 'OPTIONAL_UPDATES',
    channels: ['IN_APP'],
    smsMessage: 'ثمین گشت: پیام جدیدی برای حساب شما ارسال شد. جزئیات را در پنل امن مشاهده کنید.',
    inAppTitle: 'پیام گروهی',
    inAppMessage: 'پیام جدیدی برای حساب شما ارسال شد.',
    route: () => NOTIFICATIONS,
    exactlyOnce: false,
  },
};

export function notificationEntry(type: string): NotificationCatalogEntry | undefined {
  return notificationCatalog[type as NotificationType];
}

export function notificationPurpose(type: string): NotificationPurpose {
  return notificationEntry(type)?.purpose ?? 'SERVICE_NOTICE';
}

export function notificationAudience(type: string): NotificationAudience {
  return notificationEntry(type)?.audience ?? 'STUDENT_ACCOUNT';
}

export function notificationSmsMessage(type: string): string {
  return notificationEntry(type)?.smsMessage ??
    'ثمین گشت: اعلان جدیدی برای حساب شما ثبت شد. جزئیات را در پنل امن مشاهده کنید.';
}

export function notificationRoute(type: string, context: NotificationContext): string | null {
  return notificationEntry(type)?.route(context) ?? null;
}

export function isAdminOperational(type: string): boolean {
  return Boolean(notificationEntry(type)?.adminOperational);
}

export function adminOperationalRoute(
  type: string,
  context: NotificationContext,
): string | null {
  return notificationEntry(type)?.adminOperational?.route(context) ?? null;
}
