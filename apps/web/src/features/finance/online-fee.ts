/** Amounts are in rial. Zibal gateway fee: 1%, min 2,000 and max 20,000 toman, plus 10% VAT. */
export function onlineFee(amount: number) {
  const base = Math.min(200_000, Math.max(20_000, Math.ceil(amount / 100)));
  const tax = Math.ceil(base / 10);
  return { base, tax, fee: base + tax, total: amount + base + tax };
}
