const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

export const nationalIdError = 'کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.';

export function isValidIranianNationalId(value: string) {
  return /^\d{1,10}$/.test(normalizeDigits(value).trim());
}
