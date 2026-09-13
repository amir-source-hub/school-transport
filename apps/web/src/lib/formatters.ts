const persianNumberFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});

export function formatPersianNumber(value: number) {
  return persianNumberFormatter.format(value);
}

export function formatIrr(amount: number) {
  return `${formatPersianNumber(amount)} ریال`;
}

const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const jalaliDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatPersianTime(value: string | null | undefined) {
  if (!value) return '—';
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return value;
  return `${match[1].padStart(2, '0')}:${match[2]}`.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function formatJalaliDate(value: Date | string | number) {
  if (typeof value === 'string' && /^1[34]\d{2}[/-]\d{1,2}[/-]\d{1,2}$/.test(value))
    return value.replace(/-/g, '/').replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  return jalaliDateFormatter.format(new Date(value));
}

export function formatJalaliDateTime(value: Date | string | number) {
  return jalaliDateTimeFormatter.format(new Date(value));
}
