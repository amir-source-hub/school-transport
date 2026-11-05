const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

function threeDigits(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  if (hundred) parts.push(hundreds[hundred]);
  const rest = value % 100;
  if (rest >= 10 && rest < 20) parts.push(teens[rest - 10]);
  else {
    const ten = Math.floor(rest / 10);
    if (ten) parts.push(tens[ten]);
    if (rest % 10) parts.push(ones[rest % 10]);
  }
  return parts.join(' و ');
}

export function persianNumberWords(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999_999_999) {
    throw new RangeError('Amount is outside the supported range.');
  }
  if (value === 0) return 'صفر';
  const parts: string[] = [];
  for (const [unit, divisor] of [['میلیون', 1_000_000], ['هزار', 1_000], ['', 1]] as const) {
    const group = Math.floor(value / divisor) % 1_000;
    if (group) parts.push(`${threeDigits(group)}${unit ? ` ${unit}` : ''}`);
  }
  return parts.join(' و ');
}
