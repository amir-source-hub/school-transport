const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeIranianDigits(value: string): string {
  return [...value]
    .map((character) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(character);
      if (persianIndex >= 0) return String(persianIndex);
      const arabicIndex = ARABIC_DIGITS.indexOf(character);
      return arabicIndex >= 0 ? String(arabicIndex) : character;
    })
    .join('');
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

export function isIranianNationalId(value: string): boolean {
  const normalized = normalizeIranianDigits(value).trim();
  if (!/^\d{10}$/.test(normalized)) return false;
  return checksumPasses(normalized);
}
