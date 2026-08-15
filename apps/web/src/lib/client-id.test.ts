import { describe, expect, it, vi } from 'vitest';
import { createClientId } from './client-id';

describe('createClientId', () => {
  it('works on iOS Safari versions without crypto.randomUUID', () => {
    const original = globalThis.crypto;
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set(Array.from({ length: 16 }, (_, index) => index));
      return bytes;
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    });
    try {
      expect(createClientId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
      expect(getRandomValues).toHaveBeenCalledOnce();
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original });
    }
  });
});
