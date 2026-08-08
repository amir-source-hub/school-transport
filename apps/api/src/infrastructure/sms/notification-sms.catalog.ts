export type SmsPurpose = 'SERVICE_NOTICE' | 'OPTIONAL_UPDATES';

const OPTIONAL_TYPES = new Set([
  'WELCOME',
  'PROFILE_UPDATED',
  'ADDRESS_UPDATED',
  'EMERGENCY_CONTACT_UPDATED',
]);

export function smsPurposeFor(notificationType: string): SmsPurpose {
  return OPTIONAL_TYPES.has(notificationType) ? 'OPTIONAL_UPDATES' : 'SERVICE_NOTICE';
}

export function safeSmsMessage(notificationType: string): string {
  if (notificationType.includes('PAYMENT') || notificationType.includes('PRICE')) {
    return 'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.';
  }
  if (notificationType.includes('CONTRACT')) {
    return 'ثمین گشت: وضعیت قرارداد سرویس تغییر کرد. جزئیات را در پنل امن مشاهده کنید.';
  }
  if (notificationType.includes('LIMIT_REQUEST')) {
    return 'ثمین گشت: وضعیت درخواست ظرفیت دانش‌آموز تغییر کرد. جزئیات در پنل شماست.';
  }
  if (notificationType.includes('ENROLLMENT') || notificationType.includes('REGISTRATION')) {
    return 'ثمین گشت: وضعیت ثبت‌نام تغییر کرد. جزئیات را در پنل امن مشاهده کنید.';
  }
  return 'ثمین گشت: اعلان جدیدی برای حساب شما ثبت شد. جزئیات را در پنل امن مشاهده کنید.';
}
