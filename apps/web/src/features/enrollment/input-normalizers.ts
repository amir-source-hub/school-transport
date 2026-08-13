import { normalizeDigits } from './national-id';

export { normalizeDigits as normalizePersianDigits };

export function normalizePhoneNumber(value: string): string {
  return normalizeDigits(value).replace(/\D/g, '');
}

export function normalizeNationalId(value: string): string {
  return normalizeDigits(value).trim();
}

export function composeMobileNumber(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, '');
  if (digits.length === 9) return `09${digits}`;
  if (digits.length === 11 && /^09\d{9}$/.test(digits)) return digits;
  return '';
}

export function mobileToNineDigits(value: string): string {
  const digits = normalizePhoneNumber(value);
  return digits.length === 11 && digits.startsWith('09') ? digits.slice(2) : '';
}

export function normalizeMobileInput(value: string): string {
  let digits = normalizePhoneNumber(value);
  while (digits.startsWith('0909')) digits = `09${digits.slice(4)}`;
  if (!digits) return '09';
  return digits.startsWith('09') ? digits.slice(0, 11) : `09${digits}`.slice(0, 11);
}

export function placeCaretAfterPrefix(input: HTMLInputElement, prefixLength: number): void {
  if (input.value.length <= prefixLength) {
    requestAnimationFrame(() => input.setSelectionRange(prefixLength, prefixLength));
  }
}
