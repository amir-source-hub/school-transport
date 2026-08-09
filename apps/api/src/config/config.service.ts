import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { z } from 'zod';
import { isIP } from 'node:net';

export function parseTrustedProxyCidrs(value = ''): string[] {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const entry of entries) {
    const [address, prefix, ...extra] = entry.split('/');
    const version = isIP(address);
    const maxPrefix = version === 4 ? 32 : version === 6 ? 128 : -1;
    const validPrefix =
      prefix === undefined ||
      (/^\d{1,3}$/.test(prefix) && Number(prefix) > 0 && Number(prefix) <= maxPrefix);
    if (extra.length > 0 || version === 0 || !validPrefix) {
      throw new Error(`Invalid trusted proxy address: ${entry}`);
    }
  }
  return entries;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    PG_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    PG_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
    PG_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(250).max(30000).default(5000),
    PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(250).max(120000).default(15000),
    PG_SSL_MODE: z.enum(['disable', 'verify-full']).default('disable'),
    READINESS_TIMEOUT_MS: z.coerce.number().int().min(100).max(10000).default(2000),
    JWT_SECRET: z.string().min(16),
    JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
    JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(86400),
    JWT_REMEMBER_REFRESH_TOKEN_TTL: z.coerce.number().default(604800),
    ADMIN_JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
    ADMIN_JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(86400),
    ADMIN_JWT_REMEMBER_REFRESH_TOKEN_TTL: z.coerce.number().default(604800),
    OTP_EXPIRY_SECONDS: z.coerce.number().default(120),
    OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
    ADMIN_CHALLENGE_TTL_SECONDS: z.coerce.number().default(120),
    ONBOARDING_SESSION_TTL_SECONDS: z.coerce.number().default(604800),
    FEATURE_ADMIN_2FA: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    FEATURE_ONBOARDING: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    API_DOCS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    TRUSTED_PROXY_CIDRS: z
      .string()
      .default('')
      .transform((value, context) => {
        try {
          return parseTrustedProxyCidrs(value);
        } catch (error) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              error instanceof Error ? error.message : 'Invalid trusted proxy configuration.',
          });
          return z.NEVER;
        }
      }),
    LOG_LEVEL: z.string().default('debug'),
    OTP_PROVIDER: z.enum(['console', 'kavenegar', 'none']).default('none'),
    SMS_PROVIDER: z.enum(['kavenegar', 'none']).default('none'),
    KAVEHNEGAR_API_KEY: z.string().trim().optional(),
    KAVEHNEGAR_BASE_URL: z.string().url().default('https://api.kavenegar.com/v1'),
    KAVEHNEGAR_SENDER: z.string().trim().optional(),
    KAVEHNEGAR_OTP_TEMPLATE: z.string().trim().optional(),
    KAVEHNEGAR_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
    FEATURE_SMS_BROADCASTS: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SMS_BROADCAST_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(50),
    SMS_BROADCAST_MAX_RECIPIENTS: z.coerce.number().int().min(1).max(100_000).default(5_000),
    SMS_BROADCAST_MAX_SEGMENTS: z.coerce.number().int().min(1).max(10).default(3),
    SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL: z.coerce.number().int().min(0).default(0),
    SMS_BROADCAST_MAX_COST_RIAL: z.coerce.number().int().min(0).default(0),
    SMS_BROADCAST_TEST_NUMBERS: z.string().default(''),
    PAYMENT_GATEWAY_PROVIDER: z.enum(['mock', 'none']).default('none'),
    ARVAN_S3_ENDPOINT: z.string().trim().optional(),
    ARVAN_S3_REGION: z.string().trim().optional(),
    ARVAN_S3_BUCKET: z.string().trim().optional(),
    ARVAN_S3_ACCESS_KEY: z.string().trim().optional(),
    ARVAN_S3_SECRET_KEY: z.string().trim().optional(),
    STUDENT_PHOTO_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(1800).default(300),
    STUDENT_PHOTO_VIEW_URL_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
    STUDENT_PHOTO_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(50 * 1024 * 1024)
      .default(26_214_400),
    STUDENT_PHOTO_MAX_PIXELS: z.coerce.number().int().min(100_000).default(12_500_000),
    STUDENT_PHOTO_MAX_AXIS: z.coerce.number().int().min(1_000).max(16_000).default(8_000),
    STUDENT_PHOTO_OUTPUT_WIDTH: z.coerce.number().int().min(200).max(1_000).default(600),
    STUDENT_PHOTO_OUTPUT_HEIGHT: z.coerce.number().int().min(200).max(1_200).default(800),
    STUDENT_PHOTO_JPEG_QUALITY: z.coerce.number().int().min(60).max(95).default(85),
    STUDENT_PHOTO_MAX_ACTIVE_UPLOADS: z.coerce.number().int().min(1).max(20).default(3),
    SERVICE_ROLE: z.enum(['api', 'worker']).default('api'),
    AUTH_SESSION_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
    SEED_DEMO_DATA: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    QUEUE_REQUIRED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return;
    const issue = (path: string, message: string) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (/demo|development|replace|change/i.test(env.JWT_SECRET) || env.JWT_SECRET.length < 32) {
      issue('JWT_SECRET', 'Production requires a strong externally supplied JWT secret.');
    }
    try {
      const database = new URL(env.DATABASE_URL);
      if (!database.password)
        issue('DATABASE_URL', 'Production database credentials are required.');
    } catch {
      issue('DATABASE_URL', 'A valid production database URL is required.');
    }
    try {
      const redis = new URL(env.REDIS_URL);
      if (!redis.password) issue('REDIS_URL', 'Production Redis credentials are required.');
    } catch {
      issue('REDIS_URL', 'A valid production Redis URL is required.');
    }
    if (env.OTP_PROVIDER === 'console') issue('OTP_PROVIDER', 'Console OTP is development-only.');
    if (
      (env.OTP_PROVIDER === 'kavenegar' || env.SMS_PROVIDER === 'kavenegar') &&
      !env.KAVEHNEGAR_API_KEY
    ) {
      issue('KAVEHNEGAR_API_KEY', 'Kavenegar API key is required when its provider is enabled.');
    }
    if (env.OTP_PROVIDER === 'kavenegar' && !env.KAVEHNEGAR_OTP_TEMPLATE) {
      issue('KAVEHNEGAR_OTP_TEMPLATE', 'An approved Kavenegar VerifyLookup template is required.');
    }
    if (env.FEATURE_SMS_BROADCASTS && env.SMS_PROVIDER !== 'kavenegar') {
      issue('SMS_PROVIDER', 'Production SMS broadcasts require Kavenegar SMS delivery.');
    }
    if (env.FEATURE_SMS_BROADCASTS && env.SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL <= 0) {
      issue(
        'SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL',
        'Production broadcasts require a current per-segment price.',
      );
    }
    if (env.FEATURE_SMS_BROADCASTS && env.SMS_BROADCAST_MAX_COST_RIAL <= 0) {
      issue(
        'SMS_BROADCAST_MAX_COST_RIAL',
        'Production broadcasts require a finite campaign spend cap.',
      );
    }
    if (env.PAYMENT_GATEWAY_PROVIDER === 'mock')
      issue('PAYMENT_GATEWAY_PROVIDER', 'Mock payments are development-only.');
    const arvanValues = [
      env.ARVAN_S3_ENDPOINT,
      env.ARVAN_S3_REGION,
      env.ARVAN_S3_BUCKET,
      env.ARVAN_S3_ACCESS_KEY,
      env.ARVAN_S3_SECRET_KEY,
    ];
    const anyArvanSet = arvanValues.some((value) => value);
    if (anyArvanSet && !arvanValues.every(Boolean)) {
      issue(
        'ARVAN_S3_ENDPOINT',
        'All five ARVAN_S3_* values must be set together for student photo storage.',
      );
    }
    if (env.ARVAN_S3_ENDPOINT) {
      try {
        new URL(env.ARVAN_S3_ENDPOINT);
      } catch {
        issue('ARVAN_S3_ENDPOINT', 'ARVAN_S3_ENDPOINT must be a valid HTTPS endpoint.');
      }
    }
    if (env.SERVICE_ROLE === 'api' && env.OTP_PROVIDER === 'none') {
      issue('OTP_PROVIDER', 'Production API startup requires an integrated OTP provider.');
    }
    if (env.SERVICE_ROLE === 'api' && env.PAYMENT_GATEWAY_PROVIDER === 'none') {
      issue(
        'PAYMENT_GATEWAY_PROVIDER',
        'Production API startup requires an integrated payment gateway.',
      );
    }
    if (env.LOG_LEVEL === 'debug')
      issue('LOG_LEVEL', 'Debug logging is not permitted in production.');
    if (env.SEED_DEMO_DATA) issue('SEED_DEMO_DATA', 'Demo seeding is not permitted in production.');
  });

export function validateEnvironment(environment: NodeJS.ProcessEnv) {
  return envSchema.safeParse(environment);
}

@Injectable()
export class ConfigService implements OnApplicationShutdown {
  readonly env: z.infer<typeof envSchema>;

  constructor() {
    const result = validateEnvironment(process.env);
    if (!result.success) {
      console.error('Invalid environment configuration:', result.error.flatten().fieldErrors);
      process.exit(1);
    }
    this.env = result.data;
  }

  get port(): number {
    return this.env.PORT;
  }
  get host(): string {
    return this.env.HOST;
  }
  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }
  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }
  get redisUrl(): string {
    return this.env.REDIS_URL;
  }
  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }
  get jwtAccessTokenTtl(): number {
    return this.env.JWT_ACCESS_TOKEN_TTL;
  }
  get jwtRefreshTokenTtl(): number {
    return this.env.JWT_REFRESH_TOKEN_TTL;
  }
  get jwtRememberRefreshTokenTtl(): number {
    return this.env.JWT_REMEMBER_REFRESH_TOKEN_TTL;
  }
  get adminJwtAccessTokenTtl(): number {
    return this.env.ADMIN_JWT_ACCESS_TOKEN_TTL;
  }
  get adminJwtRefreshTokenTtl(): number {
    return this.env.ADMIN_JWT_REFRESH_TOKEN_TTL;
  }
  get adminJwtRememberRefreshTokenTtl(): number {
    return this.env.ADMIN_JWT_REMEMBER_REFRESH_TOKEN_TTL;
  }
  get otpExpirySeconds(): number {
    return this.env.OTP_EXPIRY_SECONDS;
  }
  get otpMaxAttempts(): number {
    return this.env.OTP_MAX_ATTEMPTS;
  }
  get otpResendCooldownSeconds(): number {
    return this.env.OTP_RESEND_COOLDOWN_SECONDS;
  }
  get adminChallengeTtlSeconds(): number {
    return this.env.ADMIN_CHALLENGE_TTL_SECONDS;
  }
  get onboardingSessionTtlSeconds(): number {
    return this.env.ONBOARDING_SESSION_TTL_SECONDS;
  }
  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((s) => s.trim());
  }
  get featureAdminTwoFactor(): boolean {
    return this.env.FEATURE_ADMIN_2FA;
  }
  get featureOnboarding(): boolean {
    return this.env.FEATURE_ONBOARDING;
  }
  get apiDocsEnabled(): boolean {
    return this.env.API_DOCS_ENABLED;
  }
  get pgPoolMax() {
    return this.env.PG_POOL_MAX;
  }
  get pgIdleTimeoutMs() {
    return this.env.PG_IDLE_TIMEOUT_MS;
  }
  get pgConnectTimeoutMs() {
    return this.env.PG_CONNECT_TIMEOUT_MS;
  }
  get pgStatementTimeoutMs() {
    return this.env.PG_STATEMENT_TIMEOUT_MS;
  }
  get pgSslMode() {
    return this.env.PG_SSL_MODE;
  }
  get readinessTimeoutMs() {
    return this.env.READINESS_TIMEOUT_MS;
  }
  get trustedProxyCidrs(): string[] {
    return this.env.TRUSTED_PROXY_CIDRS;
  }
  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }
  get otpProvider(): 'console' | 'kavenegar' | 'none' {
    return this.env.OTP_PROVIDER;
  }
  get smsProvider(): 'kavenegar' | 'none' {
    return this.env.SMS_PROVIDER;
  }
  get kavenegarApiKey(): string | undefined {
    return this.env.KAVEHNEGAR_API_KEY;
  }
  get kavenegarBaseUrl(): string {
    return this.env.KAVEHNEGAR_BASE_URL;
  }
  get kavenegarSender(): string | undefined {
    return this.env.KAVEHNEGAR_SENDER;
  }
  get kavenegarOtpTemplate(): string | undefined {
    return this.env.KAVEHNEGAR_OTP_TEMPLATE;
  }
  get kavenegarTimeoutMs(): number {
    return this.env.KAVEHNEGAR_TIMEOUT_MS;
  }
  get featureSmsBroadcasts(): boolean {
    return this.env.FEATURE_SMS_BROADCASTS;
  }
  get smsBroadcastBatchSize(): number {
    return this.env.SMS_BROADCAST_BATCH_SIZE;
  }
  get smsBroadcastMaxRecipients(): number {
    return this.env.SMS_BROADCAST_MAX_RECIPIENTS;
  }
  get smsBroadcastMaxSegments(): number {
    return this.env.SMS_BROADCAST_MAX_SEGMENTS;
  }
  get smsBroadcastPricePerSegmentRial(): number {
    return this.env.SMS_BROADCAST_PRICE_PER_SEGMENT_RIAL;
  }
  get smsBroadcastMaxCostRial(): number {
    return this.env.SMS_BROADCAST_MAX_COST_RIAL;
  }
  get smsBroadcastTestNumbers(): string[] {
    return this.env.SMS_BROADCAST_TEST_NUMBERS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  get paymentGatewayProvider(): 'mock' | 'none' {
    return this.env.PAYMENT_GATEWAY_PROVIDER;
  }
  get arvanS3Endpoint(): string | undefined {
    return this.env.ARVAN_S3_ENDPOINT;
  }
  get arvanS3Region(): string | undefined {
    return this.env.ARVAN_S3_REGION;
  }
  get arvanS3Bucket(): string | undefined {
    return this.env.ARVAN_S3_BUCKET;
  }
  get arvanS3AccessKey(): string | undefined {
    return this.env.ARVAN_S3_ACCESS_KEY;
  }
  get arvanS3SecretKey(): string | undefined {
    return this.env.ARVAN_S3_SECRET_KEY;
  }
  get studentPhotoUploadUrlTtlSeconds(): number {
    return this.env.STUDENT_PHOTO_UPLOAD_URL_TTL_SECONDS;
  }
  get studentPhotoViewUrlTtlSeconds(): number {
    return this.env.STUDENT_PHOTO_VIEW_URL_TTL_SECONDS;
  }
  get studentPhotoMaxBytes(): number {
    return this.env.STUDENT_PHOTO_MAX_BYTES;
  }
  get studentPhotoMaxPixels(): number {
    return this.env.STUDENT_PHOTO_MAX_PIXELS;
  }
  get studentPhotoMaxAxis(): number {
    return this.env.STUDENT_PHOTO_MAX_AXIS;
  }
  get studentPhotoOutputWidth(): number {
    return this.env.STUDENT_PHOTO_OUTPUT_WIDTH;
  }
  get studentPhotoOutputHeight(): number {
    return this.env.STUDENT_PHOTO_OUTPUT_HEIGHT;
  }
  get studentPhotoJpegQuality(): number {
    return this.env.STUDENT_PHOTO_JPEG_QUALITY;
  }
  get studentPhotoMaxActiveUploads(): number {
    return this.env.STUDENT_PHOTO_MAX_ACTIVE_UPLOADS;
  }
  get studentPhotosConfigured(): boolean {
    return Boolean(
      this.env.ARVAN_S3_ENDPOINT &&
        this.env.ARVAN_S3_REGION &&
        this.env.ARVAN_S3_BUCKET &&
        this.env.ARVAN_S3_ACCESS_KEY &&
        this.env.ARVAN_S3_SECRET_KEY,
    );
  }
  get serviceRole(): 'api' | 'worker' {
    return this.env.SERVICE_ROLE;
  }
  get authSessionRetentionDays(): number {
    return this.env.AUTH_SESSION_RETENTION_DAYS;
  }
  get seedDemoData(): boolean {
    return this.env.SEED_DEMO_DATA;
  }
  get queueRequired(): boolean {
    return (
      this.env.QUEUE_REQUIRED ||
      this.env.SERVICE_ROLE === 'worker' ||
      this.env.NODE_ENV === 'production'
    );
  }

  onApplicationShutdown() {}
}
