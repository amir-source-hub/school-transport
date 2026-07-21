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
    return {
      ...base,
      target: 'page',
      title: 'اطلاعات پیدا نشد',
      message: 'مورد درخواستی وجود ندارد یا دیگر در دسترس نیست.',
      canRetry: false,
    };
  }

  if (error.status === 409) {
    return {
      ...base,
      target: 'dialog',
      title: 'اطلاعات تغییر کرده است',
      message: 'وضعیت این مورد تغییر کرده است. اطلاعات را دوباره دریافت و سپس اقدام کنید.',
      canRetry: true,
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
