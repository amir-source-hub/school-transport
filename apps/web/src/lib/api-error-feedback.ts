import { ApiClientError } from '@/lib/api-client';

export type ErrorFeedbackTarget = 'field' | 'form' | 'toast' | 'dialog' | 'page';

export type ErrorFeedback = {
  target: ErrorFeedbackTarget;
  title: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  canRetry: boolean;
};

export function getApiErrorFeedback(error: unknown): ErrorFeedback {
  if (
    (error instanceof DOMException && error.name === 'TimeoutError') ||
    (error instanceof Error && /timeout|timed out/i.test(error.message))
  ) {
    return {
      target: 'page',
      title: 'پاسخ سرویس طول کشید',
      message: 'ارتباط با سرویس در زمان مقرر انجام نشد. اتصال را بررسی و دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  if (error instanceof TypeError) {
    return {
      target: 'page',
      title: 'اتصال برقرار نیست',
      message:
        'به نظر می‌رسد اینترنت یا سرویس در دسترس نیست. پس از برقراری اتصال دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  if (!(error instanceof ApiClientError)) {
    return {
      target: 'page',
      title: 'مشکلی پیش آمد',
      message: 'در حال حاضر انجام این درخواست ممکن نیست. لطفاً دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  const base = { requestId: error.requestId };

  const otpMessages: Record<string, { title: string; message: string; canRetry: boolean }> = {
    OTP_INVALID: {
      title: 'کد تأیید صحیح نیست',
      message: 'کد تأیید واردشده صحیح نیست. دوباره بررسی کنید.',
      canRetry: true,
    },
    OTP_EXPIRED: {
      title: 'مهلت کد به پایان رسیده است',
      message: 'زمان اعتبار کد تأیید به پایان رسیده است. کد جدید دریافت کنید.',
      canRetry: true,
    },
    OTP_REQUEST_MISSING: {
      title: 'درخواست کد معتبر نیست',
      message: 'درخواست کد معتبر نیست یا با کد جدید جایگزین شده است. دوباره کد بگیرید.',
      canRetry: true,
    },
    OTP_RESEND_COOLDOWN: {
      title: 'برای ارسال دوباره کمی صبر کنید',
      message: error.message,
      canRetry: true,
    },
    OTP_ATTEMPTS_EXCEEDED: {
      title: 'تعداد تلاش‌ها بیش از حد مجاز است',
      message: 'برای حفظ امنیت، کد فعلی غیرفعال شد. کد جدید دریافت کنید.',
      canRetry: true,
    },
    OTP_RATE_LIMIT: {
      title: 'تعداد درخواست‌ها زیاد است',
      message: 'کمی صبر کنید و سپس کد جدید درخواست کنید.',
      canRetry: true,
    },
  };
  const otpFeedback = otpMessages[error.code];
  if (otpFeedback) return { ...base, target: 'form', ...otpFeedback };

  if (['QUEUE_UNAVAILABLE', 'JOB_QUEUE_UNAVAILABLE'].includes(error.code)) {
    return {
      ...base,
      target: 'page',
      title: 'صف پردازش موقتاً در دسترس نیست',
      message: 'درخواست شما ارسال نشد. کمی بعد دوباره تلاش کنید؛ ثبت تکراری انجام نمی‌شود.',
      canRetry: true,
    };
  }

  if (['PROVIDER_UNAVAILABLE', 'PAYMENT_PROVIDER_UNAVAILABLE'].includes(error.code)) {
    return {
      ...base,
      target: 'page',
      title: 'سرویس بیرونی موقتاً در دسترس نیست',
      message: 'ارائه‌دهنده سرویس پاسخ نمی‌دهد. اطلاعات شما حفظ شده است؛ کمی بعد دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
    return {
      ...base,
      target: 'field',
      title: 'اطلاعات نیاز به اصلاح دارد',
      message: 'لطفاً موارد مشخص‌شده را بررسی و اصلاح کنید.',
      fieldErrors: error.fieldErrors,
      canRetry: false,
    };
  }

  if (error.code === 'INVALID_CREDENTIALS') {
    return {
      ...base,
      target: 'form',
      title: 'ورود ناموفق بود',
      message: 'نام کاربری یا رمز عبور درست نیست.',
      canRetry: false,
    };
  }

  if (error.isSessionExpired) {
    return {
      ...base,
      target: 'page',
      title: 'نشست شما به پایان رسیده است',
      message: 'برای ادامه، دوباره وارد حساب خود شوید.',
      canRetry: false,
    };
  }

  if (error.status === 403 || error.code === 'ACCESS_DENIED') {
    return {
      ...base,
      target: 'page',
      title: 'دسترسی مجاز نیست',
      message: 'شما اجازه مشاهده یا انجام این بخش را ندارید.',
      canRetry: false,
    };
  }

  if (error.status === 404 || error.code === 'RESOURCE_NOT_FOUND') {
    const notFoundMessages: Record<string, string> = {
      'Accepted price': 'قیمت هنوز توسط خانواده پذیرفته نشده است. ابتدا منتظر پذیرش قیمت باشید.',
    };
    const specificMessage = error.message
      ? Object.entries(notFoundMessages).find(([key]) => error.message.includes(key))?.[1]
      : undefined;
    return {
      ...base,
      target: specificMessage ? 'form' : 'page',
      title: specificMessage ? 'قیمت پذیرفته نشده' : 'اطلاعات پیدا نشد',
      message: specificMessage ?? 'مورد درخواستی وجود ندارد یا دیگر در دسترس نیست.',
      canRetry: false,
    };
  }

  if (error.status === 409) {
    const conflictMessages: Record<string, string> = {
      INVALID_NATIONAL_ID: 'کد ملی باید دقیقاً ۱۰ رقم باشد.',
      INVALID_PHONE_NUMBER: 'شماره همراه واردشده معتبر نیست. باید با ۰۹ شروع شود.',
      INVALID_BIRTH_DATE: 'تاریخ تولد باید یک تاریخ شمسی واقعی، غیرآینده و در بازه مجاز باشد.',
      INCOMPLETE_ENROLLMENT: 'تمام فیلدهای ضروری را پر کنید.',
      INVALID_LOCATION: 'موقعیت مکانی معتبر انتخاب کنید.',
      INVALID_VEHICLE_TYPE: 'نوع وسیله نقلیه انتخاب‌شده معتبر نیست.',
      INVALID_PAYMENT_PLAN: 'روش پرداخت مبلغ باقی‌مانده را انتخاب کنید.',
      INVALID_SCHOOL_PROGRAM: 'مقطع یا پایه تحصیلی انتخاب‌شده در این مدرسه ارائه نمی‌شود.',
      DUPLICATE_NATIONAL_ID: 'این کد ملی قبلاً در سامانه ثبت شده است.',
      DUPLICATE_PHONE_NUMBER: 'این شماره همراه قبلاً برای حساب دیگری ثبت شده است.',
      LOGIN_PHONE_MUST_MATCH_PARENT:
        'شماره ورود باید با شماره همراه پدر یا مادر یکسان باشد؛ همان والد به‌عنوان تماس اصلی ثبت می‌شود.',
      PARENT_PROFILE_CHANGED:
        'اطلاعات والدین از پروفایل خانواده خوانده می‌شود. برای تغییر آن ابتدا به تنظیمات پروفایل بروید.',
      PARENT_TYPE_EXISTS: 'اطلاعات این والد قبلاً ثبت شده است؛ از گزینه ویرایش استفاده کنید.',
      STUDENT_PROFILE_CHANGED:
        'مشخصات هویتی دانش‌آموز تغییر کرده است. ابتدا اطلاعات دانش‌آموز را در پروفایل اصلاح کنید.',
      STUDENT_LIMIT_REACHED:
        'ظرفیت دانش‌آموزان این حساب به پایان رسیده است. می‌توانید درخواست افزایش ظرفیت ثبت کنید.',
      LIMIT_REQUEST_ALREADY_PENDING:
        'هم‌اکنون یک درخواست افزایش ظرفیت برای این حساب در انتظار بررسی مدیریت است.',
      LIMIT_REQUEST_NOT_PENDING:
        'این درخواست افزایش ظرفیت دیگر در حالت در انتظار نیست و قابل بررسی نیست.',
      DUPLICATE_ACTIVE_ENROLLMENT:
        'یک ثبت‌نام فعال برای این دانش‌آموز در سال تحصیلی جاری وجود دارد.',
      ACTIVE_ADDRESS_REQUIRED: 'لطفاً ابتدا یک نشانی فعال ثبت کنید.',
      PRICE_ALREADY_ACCEPTED: 'قیمت قبلاً پذیرفته شده است. نسخه جدیدی ایجاد کنید.',
      PAYMENT_ALREADY_COMPLETED: 'این پرداخت قبلاً انجام شده است.',
      OFFLINE_PAYMENT_PENDING:
        'یک رسید آفلاین برای این قسط در انتظار بررسی مدیریت است. پس از رد آن می‌توانید رسید دیگری ارسال کنید.',
      PHOTO_CHANGED:
        'این عکس قبلاً بررسی شده یا نسخه آن تغییر کرده است. فهرست تازه شد؛ دوباره بررسی کنید.',
      PHOTO_SUPERSEDED: 'عکس جدیدتری برای این دانش‌آموز ثبت شده است؛ همان عکس جدید را بررسی کنید.',
      PHOTO_UPLOAD_LIMIT:
        'یک عکس قبلی هنوز در حال پردازش یا بررسی است. وضعیت عکس را تازه‌سازی کنید و عکس جدید نسازید.',
      PHOTO_UPLOAD_MISSING: 'فایل عکس در ذخیره‌گاه پیدا نشد. همان عکس را دوباره بارگذاری کنید.',
      PHOTO_PROCESSING_CONFLICT:
        'پردازش عکس هم‌زمان انجام شده است. وضعیت عکس به‌طور خودکار تازه می‌شود.',
      RECEIPT_NOT_AUTHORIZED: 'ابتدا تصویر رسید را بارگذاری کنید و سپس دوباره ارسال کنید.',
      RECEIPT_NOT_DRAFT: 'این رسید قبلاً ارسال شده یا وضعیت آن تغییر کرده است.',
    };
    const specificMessage = error.code ? conflictMessages[error.code] : undefined;
    return {
      ...base,
      target: specificMessage ? 'form' : 'dialog',
      title: specificMessage ? 'خطا در اطلاعات' : 'اطلاعات تغییر کرده است',
      message:
        specificMessage ??
        'وضعیت این مورد تغییر کرده است. اطلاعات را دوباره دریافت و سپس اقدام کنید.',
      canRetry: !specificMessage,
    };
  }

  const otpMessages: Record<string, { title: string; message: string }> = {
    OTP_INVALID: {
      title: 'کد تأیید نادرست است',
      message: 'کد واردشده درست نیست. دوباره بررسی کنید.',
    },
    OTP_EXPIRED: {
      title: 'کد تأیید منقضی شده است',
      message: 'کد تأیید منقضی شده است. کد جدیدی درخواست کنید.',
    },
    OTP_NOT_FOUND: {
      title: 'کد تأیید قابل بررسی نیست',
      message: 'درخواست کد معتبری یافت نشد. کد جدیدی درخواست کنید.',
    },
    OTP_TOO_MANY_ATTEMPTS: {
      title: 'تلاش بیش از حد مجاز',
      message: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدیدی درخواست کنید.',
    },
    OTP_COOLDOWN: {
      title: 'کد جدید خیلی زود است',
      message: 'برای دریافت کد جدید، چند ثانیه صبر کنید.',
    },
  };
  if (error.code && otpMessages[error.code]) {
    return {
      ...base,
      target: 'form',
      ...otpMessages[error.code],
      canRetry: false,
    };
  }

  if (error.status === 400 || error.code === 'VALIDATION_ERROR' || error.code === 'HTTP_ERROR') {
    const validationMessages: Array<[string, string]> = [
      ['installment', 'مبلغ و تاریخ شمسی تمام اقساط را بررسی کنید.'],
      ['Administrator was not found', 'حساب مدیر پیدا نشد.'],
      [
        'administrator with this username',
        'نام کاربری یا شماره همراه برای مدیر دیگری ثبت شده است.',
      ],
      ['approved before generating', 'ثبت‌نام باید پیش از صدور قرارداد تأیید شود.'],
      ['pickup address', 'پیش از صدور قرارداد، نشانی سوار شدن را انتخاب کنید.'],
      ['Payment plan', 'پیش از پذیرش قرارداد، برنامه پرداخت را ایجاد کنید.'],
    ];
    const translated = validationMessages.find(([key]) =>
      error.message.toLowerCase().includes(key.toLowerCase()),
    )?.[1];
    return {
      ...base,
      target: 'form',
      title: 'اطلاعات نیاز به اصلاح دارد',
      message: translated ?? error.message,
      canRetry: false,
    };
  }

  if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
    return {
      ...base,
      target: 'toast',
      title: 'تعداد درخواست‌ها زیاد است',
      message: 'کمی صبر کنید و دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  if (error.status >= 500) {
    return {
      ...base,
      target: 'page',
      title: 'سرویس موقتاً در دسترس نیست',
      message: 'مشکلی در سرویس رخ داده است. لطفاً کمی بعد دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  return {
    ...base,
    target: 'form',
    title: 'انجام درخواست ناموفق بود',
    message: 'اطلاعات را بررسی کنید و دوباره تلاش کنید.',
    canRetry: true,
  };
}
