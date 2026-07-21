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

export function isIranianNationalId(value: string): boolean {
  const normalized = normalizeIranianDigits(value).trim();
  if (!/^\d{10}$/.test(normalized) || /^(\d)\1{9}$/.test(normalized)) return false;

  const digits = [...normalized].map(Number);
  const sum = digits.slice(0, 9).reduce((total, digit, index) => {
    return total + digit * (10 - index);
  }, 0);
  const remainder = sum % 11;
  const expectedCheckDigit = remainder < 2 ? remainder : 11 - remainder;
  return digits[9] === expectedCheckDigit;
}
