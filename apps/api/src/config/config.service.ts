import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(2592000),
  ADMIN_JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(600),
  ADMIN_JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(28800),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('debug'),
  OTP_PROVIDER: z.enum(['console', 'none']).default('none'),
  PAYMENT_GATEWAY_PROVIDER: z.enum(['mock', 'none']).default('none'),
  SERVICE_ROLE: z.enum(['api', 'worker']).default('api'),
});

@Injectable()
export class ConfigService implements OnApplicationShutdown {
  readonly env: z.infer<typeof envSchema>;

  constructor() {
    const result = envSchema.safeParse(process.env);
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
  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((s) => s.trim());
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

  onApplicationShutdown() {}
}
