import { describe, expect, it } from 'vitest';
import {
  composeMobileNumber,
  mobileToNineDigits,
  normalizeMobileInput,
  normalizeNationalId,
  normalizePersianDigits,
  normalizePhoneNumber,
} from './input-normalizers';

describe('input normalizers', () => {
  it('normalizes Persian and Arabic digits', () => {
    expect(normalizePersianDigits('۰۱۲۳٤٥۶۷۸۹')).toBe('0123456789');
  });

  it('normalizes phone input to ASCII digits only', () => {
    expect(normalizePhoneNumber('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizePhoneNumber('0912-345-6789')).toBe('09123456789');
  });

  it('composes a full mobile number from the nine editable digits', () => {
    expect(composeMobileNumber('123456789')).toBe('09123456789');
    expect(composeMobileNumber('312345678')).toBe('09312345678');
    expect(composeMobileNumber('09123456789')).toBe('09123456789');
    expect(composeMobileNumber('12345')).toBe('');
    expect(composeMobileNumber('0912345678')).toBe('');
  });

  it('strips the leading 09 prefix into the nine editable digits', () => {
    expect(mobileToNineDigits('09123456789')).toBe('123456789');
    expect(mobileToNineDigits('9123456789')).toBe('');
  });

  it('keeps one editable 09 prefix across paste/autofill and Persian digits', () => {
    expect(normalizeMobileInput('')).toBe('09');
    expect(normalizeMobileInput('09123456789')).toBe('09123456789');
    expect(normalizeMobileInput('0909123456789')).toBe('09123456789');
    expect(normalizeMobileInput('090909123456789')).toBe('09123456789');
    expect(normalizeMobileInput('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });

  it('normalizes and trims national IDs without guessing length', () => {
    expect(normalizeNationalId('  ۰۱۲۳۴۵۶۷۸۹  ')).toBe('0123456789');
  });
});
