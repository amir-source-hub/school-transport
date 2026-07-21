import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function generateContractNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CTR-${timestamp}-${random}`;
}

export function calculateInstallmentAmounts(total: number, prepayment: number, count: number): number[] {
  const remaining = total - prepayment;
  const base = Math.floor(remaining / count);
  const remainder = remaining - base * count;
  const installments: number[] = [];
  for (let i = 0; i < count; i++) {
    installments.push(base + (i === count - 1 ? remainder : 0));
  }
  return installments;
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}
