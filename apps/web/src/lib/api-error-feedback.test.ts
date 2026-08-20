import { describe, expect, it } from 'vitest';
import { ApiClientError } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

describe('API error feedback', () => {
  it('maps validation details to field feedback', () => {
    const error = new ApiClientError(422, 'VALIDATION_ERROR', 'unsafe raw message', 'req-1', {
      username: ['Required'],
    });

    const feedback = getApiErrorFeedback(error);
    expect(feedback.target).toBe('field');
    expect(feedback.fieldErrors).toEqual({ username: ['Required'] });
    expect(feedback.message).not.toContain('unsafe');
  });

  it('maps expired sessions to safe page feedback', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(401, 'SESSION_EXPIRED', 'technical detail', 'req-2'),
    );

    expect(feedback.target).toBe('page');
    expect(feedback.canRetry).toBe(false);
    expect(feedback.requestId).toBe('req-2');
  });

  it('maps conflicts to a retryable dialog', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(409, 'CONCURRENT_UPDATE', 'technical detail'),
    );

    expect(feedback.target).toBe('dialog');
    expect(feedback.canRetry).toBe(true);
  });

  it('explains that the login phone must belong to a parent', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(409, 'LOGIN_PHONE_MUST_MATCH_PARENT', 'technical detail'),
    );

    expect(feedback.target).toBe('form');
    expect(feedback.message).toContain('شماره ورود');
    expect(feedback.canRetry).toBe(false);
  });

  it('maps the exhausted student capacity conflict to a Persian panel message', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(409, 'STUDENT_LIMIT_REACHED', 'capacity reached'),
    );

    expect(feedback.target).toBe('form');
    expect(feedback.message).toContain('ظرفیت دانش‌آموزان');
    expect(feedback.canRetry).toBe(false);
  });

  it('maps a duplicate limit request to a Persian panel message', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(409, 'LIMIT_REQUEST_ALREADY_PENDING', 'already pending'),
    );

    expect(feedback.target).toBe('form');
    expect(feedback.message).toContain('در انتظار بررسی');
    expect(feedback.canRetry).toBe(false);
  });

  it.each([
    [
      'OTP_INVALID',
      'کد تأیید نادرست است',
      'کد واردشده درست نیست',
      'req-otp-1',
    ],
    [
      'OTP_EXPIRED',
      'کد تأیید منقضی شده است',
      'کد جدیدی درخواست کنید',
      'req-otp-2',
    ],
    [
      'OTP_NOT_FOUND',
      'کد تأیید قابل بررسی نیست',
      'کد جدیدی درخواست کنید',
      'req-otp-3',
    ],
    [
      'OTP_TOO_MANY_ATTEMPTS',
      'تلاش بیش از حد مجاز',
      'کد جدیدی درخواست کنید',
      'req-otp-4',
    ],
    [
      'OTP_COOLDOWN',
      'کد جدید خیلی زود است',
      'چند ثانیه صبر کنید',
      'req-otp-5',
    ],
  ])('maps %s to Persian form feedback with its tracking ID', (code, title, fragment, requestId) => {
    const feedback = getApiErrorFeedback(new ApiClientError(400, code, 'raw message', requestId));

    expect(feedback.target).toBe('form');
    expect(feedback.title).toBe(title);
    expect(feedback.message).toContain(fragment);
    expect(feedback.message).not.toContain('raw message');
    expect(feedback.requestId).toBe(requestId);
    expect(feedback.canRetry).toBe(false);
  });

  it.each([
    [new TypeError('fetch failed'), 'اتصال برقرار نیست'],
    [new DOMException('timed out', 'TimeoutError'), 'پاسخ سرویس طول کشید'],
    [new ApiClientError(503, 'QUEUE_UNAVAILABLE', 'technical'), 'صف پردازش موقتاً در دسترس نیست'],
    [
      new ApiClientError(503, 'PROVIDER_UNAVAILABLE', 'technical'),
      'سرویس بیرونی موقتاً در دسترس نیست',
    ],
  ])('maps recoverable dependency failures to intentional Persian feedback', (error, title) => {
    const feedback = getApiErrorFeedback(error);
    expect(feedback.title).toBe(title);
    expect(feedback.canRetry).toBe(true);
  });
});
