/**
 * Platform commission owed by the driver (cash or Stripe fare settlement
 * does not clear this — it is a separate driver→platform obligation).
 */
export function computeCommissionCents(
  finalBillCents: number,
  commissionPercent: number,
): {
  expectedCents: number;
  collectedCents: number;
  pendingCents: number;
  commissionPercent: number;
} {
  const pct = Math.min(100, Math.max(0, Math.floor(commissionPercent)));
  const expectedCents = Math.floor((finalBillCents * pct) / 100);
  const collectedCents = 0;
  const pendingCents = Math.max(0, expectedCents - collectedCents);
  return {
    expectedCents,
    collectedCents,
    pendingCents,
    commissionPercent: pct,
  };
}
