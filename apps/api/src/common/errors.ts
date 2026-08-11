export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly field?: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, 400, undefined, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'The phone number or verification code is incorrect.') {
    super('INVALID_CREDENTIALS', message, 401);
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Session expired. Please login again.') {
    super('SESSION_EXPIRED', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied.') {
    super('ACCESS_DENIED', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const msg = id ? `${entity} with ID ${id} not found.` : `${entity} not found.`;
    super('RESOURCE_NOT_FOUND', msg, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
  }
}

export class OtpInvalidError extends AppError {
  constructor(message = 'کد واردشده نادرست است. دوباره بررسی کنید.') {
    super('OTP_INVALID', message, 400);
  }
}

export class OtpExpiredError extends AppError {
  constructor(message = 'کد تأیید منقضی شده است. کد جدیدی درخواست کنید.') {
    super('OTP_EXPIRED', message, 400);
  }
}

export class OtpNotFoundError extends AppError {
  constructor(message = 'درخواست کد معتبری یافت نشد. کد جدیدی درخواست کنید.') {
    super('OTP_NOT_FOUND', message, 400);
  }
}

export class OtpTooManyAttemptsError extends AppError {
  constructor(message = 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدیدی درخواست کنید.') {
    super('OTP_TOO_MANY_ATTEMPTS', message, 400);
  }
}

export class OtpCooldownError extends AppError {
  constructor(seconds: number) {
    super(
      'OTP_COOLDOWN',
      `برای دریافت کد جدید، ${Math.max(1, seconds)} ثانیه دیگر صبر کنید.`,
      400,
    );
  }
}
