import { PaymentStatus } from '@prisma/client';

export const SETTLED_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PAID,
  PaymentStatus.CASH_COLLECTED,
];

export function isPaymentSettled(status: PaymentStatus): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status);
}
