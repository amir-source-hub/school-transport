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
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const jalaliDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatJalaliDate(value: Date | string | number) {
  return jalaliDateFormatter.format(new Date(value));
}

export function formatJalaliDateTime(value: Date | string | number) {
  return jalaliDateTimeFormatter.format(new Date(value));
}
