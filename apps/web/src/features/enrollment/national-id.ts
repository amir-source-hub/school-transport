const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export function isValidIranianNationalId(value: string) {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d{10}$/.test(normalized) || /^(\d)\1{9}$/.test(normalized)) return false;

  const digits = [...normalized].map(Number);
  const remainder =
    digits.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0) % 11;
  const expected = remainder < 2 ? remainder : 11 - remainder;
  return digits[9] === expected;
}
