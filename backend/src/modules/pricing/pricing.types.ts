export type BillBreakdown = {
  currency: 'PKR';
  lockedBaseRateCents: number;
  aiTripCostCents: number;
  perTruckCents: number;
  truckCount: number;
  totalBillCents: number;
  /** Server is source of truth — client totals are ignored */
  authoritative: true;
  flaggedOutlier: boolean;
};

export type TrainingSample = {
  tripId: string;
  distanceMeters: number;
  durationSeconds: number;
  lockedBaseRateCents: number;
  aiCostCents: number;
  finalBillCents: number;
  completedAt: string | null;
};
