const persianNumberFormatter = new Intl.NumberFormat('fa-IR', {
  maximumFractionDigits: 0,
});

export function formatPersianNumber(value: number) {
  return persianNumberFormatter.format(value);
}

export function formatIrr(amount: number) {
  return `${formatPersianNumber(amount)} ریال`;
}
