const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

function checksumPasses(digits: string): boolean {
  if (digits.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false;
  const sum = [...digits.slice(0, 9)].reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  );
  const remainder = sum % 11;
  const checkDigit = Number(digits[9]);
  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
}

export function isValidIranianNationalId(value: string) {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d{10}$/.test(normalized)) return false;
  return checksumPasses(normalized);
}
