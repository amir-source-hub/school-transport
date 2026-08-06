import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { z } from 'zod';
import { isIP } from 'node:net';

export function parseTrustedProxyCidrs(value = ''): string[] {
  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
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

const envSchema = z.object({
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
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(2592000),
  ADMIN_JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(3600),
  ADMIN_JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(604800),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  ADMIN_CHALLENGE_TTL_SECONDS: z.coerce.number().default(120),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TRUSTED_PROXY_CIDRS: z.string().default('').transform((value, context) => {
    try {
      return parseTrustedProxyCidrs(value);
    } catch (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : 'Invalid trusted proxy configuration.',
      });
      return z.NEVER;
    }
  }),
  LOG_LEVEL: z.string().default('debug'),
  OTP_PROVIDER: z.enum(['console', 'none']).default('none'),
  PAYMENT_GATEWAY_PROVIDER: z.enum(['mock', 'none']).default('none'),
  SERVICE_ROLE: z.enum(['api', 'worker']).default('api'),
  AUTH_SESSION_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  SEED_DEMO_DATA: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  QUEUE_REQUIRED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
}).superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') return;
  const issue = (path: string, message: string) =>
    context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  if (/demo|development|replace|change/i.test(env.JWT_SECRET) || env.JWT_SECRET.length < 32) {
    issue('JWT_SECRET', 'Production requires a strong externally supplied JWT secret.');
  }
  try {
    const database = new URL(env.DATABASE_URL);
    if (!database.password) issue('DATABASE_URL', 'Production database credentials are required.');
  } catch { issue('DATABASE_URL', 'A valid production database URL is required.'); }
  try {
    const redis = new URL(env.REDIS_URL);
    if (!redis.password) issue('REDIS_URL', 'Production Redis credentials are required.');
  } catch { issue('REDIS_URL', 'A valid production Redis URL is required.'); }
  if (env.OTP_PROVIDER === 'console') issue('OTP_PROVIDER', 'Console OTP is development-only.');
  if (env.PAYMENT_GATEWAY_PROVIDER === 'mock') issue('PAYMENT_GATEWAY_PROVIDER', 'Mock payments are development-only.');
  if (env.SERVICE_ROLE === 'api' && env.OTP_PROVIDER === 'none') {
    issue('OTP_PROVIDER', 'Production API startup requires an integrated OTP provider.');
  }
  if (env.SERVICE_ROLE === 'api' && env.PAYMENT_GATEWAY_PROVIDER === 'none') {
    issue(
      'PAYMENT_GATEWAY_PROVIDER',
      'Production API startup requires an integrated payment gateway.',
    );
  }
  if (env.LOG_LEVEL === 'debug') issue('LOG_LEVEL', 'Debug logging is not permitted in production.');
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
  get adminJwtAccessTokenTtl(): number {
    return this.env.ADMIN_JWT_ACCESS_TOKEN_TTL;
  }
  get adminJwtRefreshTokenTtl(): number {
    return this.env.ADMIN_JWT_REFRESH_TOKEN_TTL;
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
  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((s) => s.trim());
  }
  get pgPoolMax() { return this.env.PG_POOL_MAX; }
  get pgIdleTimeoutMs() { return this.env.PG_IDLE_TIMEOUT_MS; }
  get pgConnectTimeoutMs() { return this.env.PG_CONNECT_TIMEOUT_MS; }
  get pgStatementTimeoutMs() { return this.env.PG_STATEMENT_TIMEOUT_MS; }
  get pgSslMode() { return this.env.PG_SSL_MODE; }
  get readinessTimeoutMs() { return this.env.READINESS_TIMEOUT_MS; }
  get trustedProxyCidrs(): string[] {
    return this.env.TRUSTED_PROXY_CIDRS;
  }
  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }
  get otpProvider(): 'console' | 'none' {
    return this.env.OTP_PROVIDER;
  }
  get paymentGatewayProvider(): 'mock' | 'none' {
    return this.env.PAYMENT_GATEWAY_PROVIDER;
  }
  get serviceRole(): 'api' | 'worker' {
    return this.env.SERVICE_ROLE;
  }
  get authSessionRetentionDays(): number {
    return this.env.AUTH_SESSION_RETENTION_DAYS;
  }
  get seedDemoData(): boolean { return this.env.SEED_DEMO_DATA; }
  get queueRequired(): boolean {
    return (
      this.env.QUEUE_REQUIRED ||
      this.env.SERVICE_ROLE === 'worker' ||
      this.env.NODE_ENV === 'production'
    );
  }

  onApplicationShutdown() {}
}
