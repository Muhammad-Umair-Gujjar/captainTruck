import { computeCommissionCents } from './commission.math';

describe('computeCommissionCents', () => {
  it('snapshots 10% of bill', () => {
    const r = computeCommissionCents(400_000, 10);
    expect(r.expectedCents).toBe(40_000);
    expect(r.collectedCents).toBe(0);
    expect(r.pendingCents).toBe(40_000);
    expect(r.commissionPercent).toBe(10);
  });

  it('floors fractional cents', () => {
    expect(computeCommissionCents(1001, 10).expectedCents).toBe(100);
  });

  it('clamps percent to 0–100', () => {
    expect(computeCommissionCents(1000, -5).expectedCents).toBe(0);
    expect(computeCommissionCents(1000, 150).expectedCents).toBe(1000);
  });

  it('never yields negative pending', () => {
    expect(computeCommissionCents(0, 10).pendingCents).toBe(0);
  });
});
