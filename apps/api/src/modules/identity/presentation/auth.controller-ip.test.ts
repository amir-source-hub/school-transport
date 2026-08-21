import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';

describe('AuthController OTP client IP', () => {
  it('authenticates a family with phone and national ID without requesting OTP', async () => {
    const auth = {
      authenticateParent: vi.fn().mockResolvedValue({
        user: null,
        onboarding: {
          token: 'onboarding-token',
          sessionId: 'session-1',
          expiresAt: new Date(Date.now() + 60_000),
          currentStep: null,
          nationalId: '0084575948',
        },
      }),
    };
    const reply = { setCookie: vi.fn() };
    const controller = new AuthController(auth as never, { nodeEnv: 'test' } as never);
    await controller.parentCredentials(
      { ip: '203.0.113.8', headers: {} } as never,
      { phoneNumber: '09120000000', nationalId: '0084575948' },
      reply as never,
    );
    expect(auth.authenticateParent).toHaveBeenCalledWith(
      '09120000000',
      '0084575948',
      expect.objectContaining({ ipAddress: '203.0.113.8' }),
      false,
      undefined,
    );
  });

  it('authenticates an admin with username and password without creating an OTP challenge', async () => {
    const auth = {
      loginAdmin: vi.fn().mockResolvedValue({
        user: { id: 'admin-1', username: 'admin', phoneNumber: '09120000000', role: 'ADMIN' },
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    };
    const reply = { setCookie: vi.fn() };
    const controller = new AuthController(
      auth as never,
      {
        nodeEnv: 'test',
        adminJwtRefreshTokenTtl: 3600,
        adminJwtAccessTokenTtl: 900,
      } as never,
    );
    await controller.adminLogin(
      { ip: '203.0.113.10', headers: {} } as never,
      { username: 'admin', password: 'secret' },
      reply as never,
    );
    expect(auth.loginAdmin).toHaveBeenCalledWith(
      'admin',
      'secret',
      expect.objectContaining({ ipAddress: '203.0.113.10' }),
      false,
    );
    expect(auth).not.toHaveProperty('createAdminChallenge');
  });

  it('uses Fastify trusted req.ip and ignores a client-supplied forwarding header', async () => {
    const auth = { requestAuthOtp: vi.fn().mockResolvedValue({}) };
    const controller = new AuthController(auth as never, {} as never);
    await controller.requestOtp(
      { ip: '203.0.113.8', headers: { 'x-forwarded-for': '198.51.100.99' } } as never,
      { phoneNumber: '09120000000', role: 'PARENT' },
    );
    expect(auth.requestAuthOtp).toHaveBeenCalledWith('09120000000', 'PARENT', '203.0.113.8');
  });

  it('passes the trusted req.ip to the admin password challenge', async () => {
    const auth = { createAdminChallenge: vi.fn().mockResolvedValue({}) };
    const controller = new AuthController(auth as never, {} as never);
    await controller.passwordChallenge({ ip: '203.0.113.10', headers: {} } as never, {
      username: 'demo-admin',
      password: 'something-secure',
    });
    expect(auth.createAdminChallenge).toHaveBeenCalledWith(
      'demo-admin',
      'something-secure',
      '203.0.113.10',
    );
  });
});
