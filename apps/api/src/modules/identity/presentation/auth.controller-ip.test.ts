import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';

describe('AuthController OTP client IP', () => {
  it('uses Fastify trusted req.ip and ignores a client-supplied forwarding header', async () => {
    const auth = { requestAuthOtp: vi.fn().mockResolvedValue({}) };
    const controller = new AuthController(auth as never, {} as never);
    await controller.requestOtp(
      { ip: '203.0.113.8', headers: { 'x-forwarded-for': '198.51.100.99' } } as never,
      { phoneNumber: '09120000000', role: 'PARENT' },
    );
    expect(auth.requestAuthOtp).toHaveBeenCalledWith('09120000000', 'PARENT', '203.0.113.8');
  });
});
