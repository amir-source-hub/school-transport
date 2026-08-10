export const LATIN_KEYBOARD_MESSAGE = 'لطفاً صفحه‌کلید را به فارسی تغییر دهید';

const PERSIAN_LETTER_RANGE = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const HALF_SPACE = '\\u200C';
const RTL_MARK = '\\u200f';
const SPACE = '\\u0020';
const ARABIC_COMMA = '\\u060C';

export const LATIN_LETTER = /[A-Za-z]/;

export const ALLOWED_PERSIAN_TEXT = new RegExp(
  `^[${PERSIAN_LETTER_RANGE}${HALF_SPACE}${RTL_MARK}${SPACE}${ARABIC_COMMA}]+$`,
);

export function detectLatin(value: string): boolean {
  return LATIN_LETTER.test(value);
}

export function normalizePersianPresentation(value: string): string {
  return value.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

export function hasPersianText(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value);
}

export function isAllowedPersianText(value: string): boolean {
  return ALLOWED_PERSIAN_TEXT.test(value);
}

export function isValidPersianText(value: string): boolean {
  if (!value) return false;
  if (detectLatin(value)) return false;
  return ALLOWED_PERSIAN_TEXT.test(normalizePersianPresentation(value));
}

export function persianTextMessage(value: string): string {
  if (detectLatin(value)) return LATIN_KEYBOARD_MESSAGE;
  return 'لطفاً فقط از حروف فارسی و موارد مجاز (فاصله و ویرگول) استفاده کنید.';
}
