export const getFinanceStatusTone = (status: string) => {
  if (status.includes('پرداخت‌شده') || status === 'فعال' || status === 'پذیرفته‌شده')
    return 'success' as const;
  if (status.includes('گذشته') || status.includes('رد')) return 'danger' as const;
  if (status.includes('لغو')) return 'neutral' as const;
  return 'warning' as const;
};
