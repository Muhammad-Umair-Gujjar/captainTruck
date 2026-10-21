import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, UserRole } from '@prisma/client';
import {
  CommissionErrorCode,
  TripErrorCode,
} from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { computeCommissionCents } from './commission.math';
import { ListCommissionsQueryDto } from './dto/list-commissions.query.dto';

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Idempotent: one ledger row per trip (unique tripId).
   * Snapshots COMMISSION_PERCENT at creation time.
   */
  async createOnTripComplete(
    tx: Prisma.TransactionClient,
    input: {
      tripId: string;
      driverId: string;
      finalBillCents: number;
    },
  ) {
    const existing = await tx.commissionLedger.findUnique({
      where: { tripId: input.tripId },
    });
    if (existing) return existing;

    const math = computeCommissionCents(
      input.finalBillCents,
      this.config.commissionPercent,
    );

    return tx.commissionLedger.create({
      data: {
        tripId: input.tripId,
        driverId: input.driverId,
        expectedCents: math.expectedCents,
        collectedCents: math.collectedCents,
        pendingCents: math.pendingCents,
        commissionPercent: math.commissionPercent,
      },
    });
  }

  async assertPaymentSettledForRequest(
    tx: Prisma.TransactionClient,
    requestId: string,
    tripId: string,
  ): Promise<void> {
    const settled = await tx.payment.findFirst({
      where: {
        OR: [{ requestId }, { tripId }],
        status: {
          in: [PaymentStatus.PAID, PaymentStatus.CASH_COLLECTED],
        },
      },
    });
    if (!settled) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        TripErrorCode.PAYMENT_REQUIRED,
        'Cannot complete trip without settled payment (PAID or CASH_COLLECTED)',
      );
    }
  }

  async listMine(actor: AuthUser, query: ListCommissionsQueryDto) {
    if (actor.role !== UserRole.DRIVER) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        CommissionErrorCode.FORBIDDEN,
        'Only drivers can list their commission ledger',
      );
    }
    return this.list({ ...query, driverId: actor.id }, actor);
  }

  async listAdmin(actor: AuthUser, query: ListCommissionsQueryDto) {
    if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        CommissionErrorCode.FORBIDDEN,
        'Admin only',
      );
    }
    return this.list(query, actor);
  }

  async driverSummary(actor: AuthUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        CommissionErrorCode.FORBIDDEN,
        'Admin only',
      );
    }

    const rows = await this.prisma.commissionLedger.groupBy({
      by: ['driverId'],
      _sum: {
        expectedCents: true,
        collectedCents: true,
        pendingCents: true,
      },
      _count: { _all: true },
    });

    const driverIds = rows.map((r) => r.driverId);
    const drivers = await this.prisma.user.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    const byId = new Map(drivers.map((d) => [d.id, d]));

    return {
      rule: 'Driver owes platform commissionPercent of finalBill (cash or Stripe); fare settlement ≠ commission clearance',
      items: rows.map((r) => ({
        driverId: r.driverId,
        driver: byId.get(r.driverId) ?? null,
        tripCount: r._count._all,
        expectedCents: r._sum.expectedCents ?? 0,
        collectedCents: r._sum.collectedCents ?? 0,
        pendingCents: r._sum.pendingCents ?? 0,
      })),
    };
  }

  async getById(actor: AuthUser, id: string) {
    const row = await this.prisma.commissionLedger.findUnique({
      where: { id },
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            finalBillCents: true,
            completedAt: true,
            requestId: true,
          },
        },
        driver: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
    if (!row) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        CommissionErrorCode.NOT_FOUND,
        'Commission ledger entry not found',
      );
    }
    this.assertCanView(actor, row.driverId);
    return this.toPublic(row);
  }

  /**
   * Admin marks commission received from driver.
   * Sets collected = expected, pending = 0. Idempotent if already confirmed.
   */
  async confirmReceived(actor: AuthUser, id: string) {
    if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        CommissionErrorCode.FORBIDDEN,
        'Only admins can confirm commission received (drivers cannot self-confirm)',
      );
    }

    const row = await this.prisma.commissionLedger.findUnique({
      where: { id },
    });
    if (!row) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        CommissionErrorCode.NOT_FOUND,
        'Commission ledger entry not found',
      );
    }

    if (row.adminConfirmedAt) {
      return this.getById(actor, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.commissionLedger.update({
        where: { id },
        data: {
          collectedCents: row.expectedCents,
          pendingCents: 0,
          adminConfirmedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'COMMISSION_CONFIRM',
          entityType: 'CommissionLedger',
          entityId: id,
          metadata: {
            driverId: row.driverId,
            tripId: row.tripId,
            expectedCents: row.expectedCents,
          },
        },
      });
      return next;
    });

    return this.getById(actor, updated.id);
  }

  private async list(query: ListCommissionsQueryDto, actor: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CommissionLedgerWhereInput = {};
    if (query.driverId) where.driverId = query.driverId;
    if (query.unconfirmedOnly) where.adminConfirmedAt = null;

    if (actor.role === UserRole.DRIVER) {
      where.driverId = actor.id;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.commissionLedger.count({ where }),
      this.prisma.commissionLedger.findMany({
        where,
        include: {
          trip: {
            select: {
              id: true,
              status: true,
              finalBillCents: true,
              completedAt: true,
              requestId: true,
            },
          },
          driver: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((r) => this.toPublic(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private assertCanView(actor: AuthUser, driverId: string) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.DRIVER && actor.id === driverId) return;
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      CommissionErrorCode.FORBIDDEN,
      'Cannot view this commission entry',
    );
  }

  private toPublic(row: {
    id: string;
    driverId: string;
    tripId: string;
    expectedCents: number;
    collectedCents: number;
    pendingCents: number;
    commissionPercent: number;
    adminConfirmedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    trip?: unknown;
    driver?: unknown;
  }) {
    return {
      id: row.id,
      driverId: row.driverId,
      tripId: row.tripId,
      expectedCents: row.expectedCents,
      collectedCents: row.collectedCents,
      pendingCents: row.pendingCents,
      commissionPercent: row.commissionPercent,
      adminConfirmedAt: row.adminConfirmedAt,
      confirmed: row.adminConfirmedAt != null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      trip: row.trip ?? undefined,
      driver: row.driver ?? undefined,
      rule: 'Commission owed by driver to platform; independent of customer cash/Stripe settlement',
    };
  }
}
