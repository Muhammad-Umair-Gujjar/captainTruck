import { HttpStatus, Injectable } from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { PricingErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { PrismaService } from '../prisma/prisma.service';
import type { BillBreakdown, TrainingSample } from './pricing.types';

/** Max AI trip cost: PKR 100,000.00 */
const MAX_AI_COST_CENTS = 10_000_000;

/**
 * Soft outlier: more than ~PKR 200 per km (20000 cents / 1000m).
 * Hard reject above this for FYP safety.
 */
const MAX_CENTS_PER_METER = 20;

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate on-device TFLite AI cost. Rejects negatives, huge values, and distance outliers.
   */
  validateAiCostCents(
    aiCostCents: number,
    distanceMeters: number,
  ): { ok: true; flaggedOutlier: boolean } {
    if (!Number.isInteger(aiCostCents) || aiCostCents < 0) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PricingErrorCode.INVALID_AI_COST,
        'aiCostCents must be a non-negative integer (PKR cents)',
      );
    }

    if (aiCostCents > MAX_AI_COST_CENTS) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PricingErrorCode.INVALID_AI_COST,
        `aiCostCents exceeds maximum of ${MAX_AI_COST_CENTS}`,
      );
    }

    if (distanceMeters > 0) {
      const centsPerMeter = aiCostCents / distanceMeters;
      if (centsPerMeter > MAX_CENTS_PER_METER) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          PricingErrorCode.OUTLIER_AI_COST,
          'AI cost is an outlier relative to route distance',
          {
            aiCostCents,
            distanceMeters,
            centsPerMeter: Math.round(centsPerMeter * 100) / 100,
            maxCentsPerMeter: MAX_CENTS_PER_METER,
          },
        );
      }
    }

    // Soft flag for moderately high costs (half of hard max per meter)
    const flaggedOutlier =
      distanceMeters > 0 &&
      aiCostCents / distanceMeters > MAX_CENTS_PER_METER / 2;

    return { ok: true, flaggedOutlier };
  }

  /**
   * Server-authoritative bill. Always uses lockedBaseRateCents (never live rates).
   * Formula: perTruck = lockedBase + aiTripCost; total = perTruck * truckCount
   */
  computeBill(input: {
    lockedBaseRateCents: number | null | undefined;
    aiTripCostCents: number;
    truckCount: number;
    flaggedOutlier?: boolean;
  }): BillBreakdown {
    if (
      input.lockedBaseRateCents == null ||
      input.lockedBaseRateCents < 1
    ) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PricingErrorCode.MISSING_BASE_RATE,
        'lockedBaseRateCents is missing; cannot compute bill',
      );
    }

    const perTruckCents =
      input.lockedBaseRateCents + input.aiTripCostCents;
    const totalBillCents = perTruckCents * input.truckCount;

    return {
      currency: 'PKR',
      lockedBaseRateCents: input.lockedBaseRateCents,
      aiTripCostCents: input.aiTripCostCents,
      perTruckCents,
      truckCount: input.truckCount,
      totalBillCents,
      authoritative: true,
      flaggedOutlier: input.flaggedOutlier ?? false,
    };
  }

  /** Last 20 completed trips for on-device TFLite retrain sync. */
  async getTrainingSamples(limit = 20): Promise<TrainingSample[]> {
    const trips = await this.prisma.trip.findMany({
      where: {
        status: TripStatus.COMPLETED,
        finalBillCents: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: Math.min(limit, 20),
      include: {
        request: {
          include: {
            routeOptions: { where: { isSelected: true }, take: 1 },
          },
        },
      },
    });

    return trips
      .map((trip) => {
        const selected = trip.request.routeOptions[0];
        if (!selected || trip.finalBillCents == null) return null;
        return {
          tripId: trip.id,
          distanceMeters: selected.distanceMeters,
          durationSeconds: selected.durationSeconds,
          lockedBaseRateCents: trip.request.lockedBaseRateCents ?? 0,
          aiCostCents: selected.aiCostCents,
          finalBillCents: trip.finalBillCents,
          completedAt: trip.completedAt?.toISOString() ?? null,
        } satisfies TrainingSample;
      })
      .filter((s): s is TrainingSample => s !== null);
  }
}
