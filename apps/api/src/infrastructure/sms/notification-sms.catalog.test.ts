import { describe, expect, it } from 'vitest';
import { safeSmsMessage, smsPurposeFor } from './notification-sms.catalog';

describe('notification SMS catalog', () => {
  it('keeps optional updates consent-bound and service events operational', () => {
    expect(smsPurposeFor('PROFILE_UPDATED')).toBe('OPTIONAL_UPDATES');
    expect(smsPurposeFor('PAYMENT_SUCCEEDED')).toBe('SERVICE_NOTICE');
    expect(smsPurposeFor('CONTRACT_READY')).toBe('SERVICE_NOTICE');
  });

  it('does not include child, address, identifier, or amount data in provider messages', () => {
    expect(safeSmsMessage('PAYMENT_SUCCEEDED')).toBe(
      'ثمین گشت: وضعیت مالی سرویس شما تغییر کرد. جزئیات را در پنل امن مشاهده کنید.',
    );
  });
});
