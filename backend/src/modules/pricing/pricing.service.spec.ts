import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const prisma = {} as never;
  const service = new PricingService(prisma);

  it('computes perTruck and total from locked base + AI', () => {
    const bill = service.computeBill({
      lockedBaseRateCents: 150_000,
      aiTripCostCents: 50_000,
      truckCount: 2,
    });

    expect(bill.perTruckCents).toBe(200_000);
    expect(bill.totalBillCents).toBe(400_000);
    expect(bill.authoritative).toBe(true);
    expect(bill.currency).toBe('PKR');
  });

  it('rejects missing base rate', () => {
    expect(() =>
      service.computeBill({
        lockedBaseRateCents: null,
        aiTripCostCents: 10,
        truckCount: 1,
      }),
    ).toThrow();
  });

  it('rejects negative AI cost', () => {
    expect(() => service.validateAiCostCents(-1, 1000)).toThrow();
  });

  it('rejects outlier AI cost vs distance', () => {
    expect(() => service.validateAiCostCents(1_000_000, 100)).toThrow();
  });

  it('accepts reasonable AI cost', () => {
    const result = service.validateAiCostCents(50_000, 10_000);
    expect(result.ok).toBe(true);
  });
});
