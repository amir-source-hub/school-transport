import { describe, expect, it, vi } from 'vitest';
import { ConsoleOtpDelivery } from './otp-delivery';

describe('development OTP delivery logging', () => {
  it('does not write the phone number or OTP to stdout/stderr', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await new ConsoleOtpDelivery().send({
        phoneNumber: '09121234567',
        purpose: 'AUTH_PARENT',
        code: '123456',
      });
      expect(warn).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      log.mockRestore();
    }
  });
});
