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
  if (!(error instanceof ApiClientError)) {
    return {
      target: 'page',
      title: 'مشکلی پیش آمد',
      message: 'در حال حاضر انجام این درخواست ممکن نیست. لطفاً دوباره تلاش کنید.',
      canRetry: true,
    };
  }

  const base = { requestId: error.requestId };

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
      INVALID_NATIONAL_ID: 'کد ملی واردشده معتبر نیست. فقط عدد و حداکثر ۲۰ رقم وارد کنید.',
      INVALID_PHONE_NUMBER: 'شماره همراه واردشده معتبر نیست. باید با ۰۹ شروع شود.',
      INCOMPLETE_ENROLLMENT: 'تمام فیلدهای ضروری را پر کنید.',
      INVALID_LOCATION: 'موقعیت مکانی معتبر انتخاب کنید.',
      INVALID_VEHICLE_TYPE: 'نوع وسیله نقلیه انتخاب‌شده معتبر نیست.',
      INVALID_SCHOOL_PROGRAM: 'مقطع یا پایه تحصیلی انتخاب‌شده در این مدرسه ارائه نمی‌شود.',
      DUPLICATE_NATIONAL_ID: 'این دانش‌آموز قبلاً ثبت‌نام شده است.',
      DUPLICATE_ACTIVE_ENROLLMENT:
        'یک ثبت‌نام فعال برای این دانش‌آموز در سال تحصیلی جاری وجود دارد.',
      ACTIVE_ADDRESS_REQUIRED: 'لطفاً ابتدا یک نشانی فعال ثبت کنید.',
      PRICE_ALREADY_ACCEPTED: 'قیمت قبلاً پذیرفته شده است. نسخه جدیدی ایجاد کنید.',
      PAYMENT_ALREADY_COMPLETED: 'این پرداخت قبلاً انجام شده است.',
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
