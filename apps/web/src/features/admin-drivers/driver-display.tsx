const labels: Record<string, string> = {
  MALE: 'مرد', FEMALE: 'زن', BELOW_DIPLOMA: 'زیر دیپلم', DIPLOMA: 'دیپلم', ASSOCIATE: 'کاردانی', BACHELOR: 'کارشناسی', MASTER: 'کارشناسی ارشد', DOCTORATE: 'دکتری',
  CAR: 'سواری', VAN: 'ون', MINIBUS: 'مینی‌بوس', BUS: 'اتوبوس', PERSONAL: 'شخصی', TAXI: 'تاکسی', SELF: 'ملکی', OTHER: 'متعلق به دیگری', ACTIVE: 'فعال', INACTIVE: 'غیرفعال',
};
export const driverValueLabel = (value: unknown) => labels[String(value)] ?? String(value ?? '—');

export function IranianPlate({ value }: { value?: string | null }) {
  const match = value?.match(/^(\d{2})([^\d])(\d{3})(\d{2})$/);
  if (!match) return <span dir="ltr">{value || '—'}</span>;
  return <span className="inline-flex overflow-hidden rounded-lg border-2 border-slate-800 bg-white text-base font-black" dir="ltr"><span className="bg-blue-700 px-1 text-[9px] text-white">IR</span><span className="px-2 py-1">{match[1]}</span><span className="px-1 py-1">{match[2]}</span><span className="px-2 py-1">{match[3]}</span><span className="border-l-2 border-slate-800 px-2 py-1">ایران {match[4]}</span></span>;
}
