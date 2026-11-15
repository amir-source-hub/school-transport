import { ValidationError } from '../../common/errors';

/** Zibal's published gateway tariff: 1%, bounded to 2,000–20,000 toman, plus 10% VAT. Inputs and outputs are rial. */
export function calculateOnlineFee(amountRial: number) {
  if (!Number.isSafeInteger(amountRial) || amountRial <= 0) throw new ValidationError('Invalid payment amount');
  const baseFee = Math.min(200_000, Math.max(20_000, Math.ceil(amountRial / 100)));
  const tax = Math.ceil(baseFee / 10);
  const fee = baseFee + tax;
  const total = amountRial + fee;
  if (!Number.isSafeInteger(total) || total > 2_147_483_647) throw new ValidationError('Payment amount exceeds gateway range');
  return { baseFee, tax, fee, total };
}
