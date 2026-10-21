import { HttpStatus, Injectable } from '@nestjs/common';
import { DispatchStatus, Prisma } from '@prisma/client';
import { TruckErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTruckTypeDto } from './dto/create-truck-type.dto';
import { SetBaseRateDto } from './dto/set-base-rate.dto';
import { UpdateTruckTypeDto } from './dto/update-truck-type.dto';

const OPEN_DISPATCH_STATUSES: DispatchStatus[] = [
  DispatchStatus.DRAFT,
  DispatchStatus.AWAITING_ROUTE_SELECTION,
  DispatchStatus.PENDING_ADMIN,
  DispatchStatus.APPROVED_ASSIGNED,
  DispatchStatus.IN_PROGRESS,
];

@Injectable()
export class TruckTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current rate for a truck type (latest effectiveFrom <= now). */
  async getCurrentRateCents(truckTypeId: string): Promise<number | null> {
    const rate = await this.prisma.baseRate.findFirst({
      where: {
        truckTypeId,
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    return rate?.amountCents ?? null;
  }

  async listActiveForCustomers() {
    const types = await this.prisma.truckType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        baseRates: {
          where: { effectiveFrom: { lte: new Date() } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });

    return types.map((t) => this.toPublicTruckType(t));
  }

  async listAllAdmin() {
    const types = await this.prisma.truckType.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        baseRates: {
          where: { effectiveFrom: { lte: new Date() } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });
    return types.map((t) => this.toPublicTruckType(t));
  }

  async getById(id: string, activeOnly = false) {
    const type = await this.prisma.truckType.findUnique({
      where: { id },
      include: {
        baseRates: {
          where: { effectiveFrom: { lte: new Date() } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });
    if (!type || (activeOnly && !type.isActive)) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        TruckErrorCode.NOT_FOUND,
        'Truck type not found',
      );
    }
    return this.toPublicTruckType(type);
  }

  async create(actor: AuthUser, dto: CreateTruckTypeDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.truckType.findUnique({
      where: { code },
    });
    if (existing) {
      throw appHttpError(
        HttpStatus.CONFLICT,
        TruckErrorCode.CODE_TAKEN,
        'Truck type code already exists',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const truckType = await tx.truckType.create({
        data: {
          code,
          name: dto.name.trim(),
          capacity: dto.capacity?.trim() || null,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.initialRateCents !== undefined) {
        if (dto.initialRateCents < 1) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            TruckErrorCode.INVALID_RATE,
            'initialRateCents must be greater than 0',
          );
        }
        await tx.baseRate.create({
          data: {
            truckTypeId: truckType.id,
            amountCents: dto.initialRateCents,
            effectiveFrom: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'TRUCK_TYPE_CREATE',
          entityType: 'TruckType',
          entityId: truckType.id,
          metadata: { code, initialRateCents: dto.initialRateCents ?? null },
        },
      });

      return truckType;
    });

    return this.getById(created.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdateTruckTypeDto) {
    const existing = await this.prisma.truckType.findUnique({ where: { id } });
    if (!existing) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        TruckErrorCode.NOT_FOUND,
        'Truck type not found',
      );
    }

    if (dto.isActive === false && existing.isActive) {
      await this.assertNoOpenRequests(id);
    }

    const data: Prisma.TruckTypeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.capacity !== undefined) {
      data.capacity = dto.capacity?.trim() || null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    await this.prisma.$transaction(async (tx) => {
      await tx.truckType.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'TRUCK_TYPE_UPDATE',
          entityType: 'TruckType',
          entityId: id,
          metadata: { ...dto },
        },
      });
    });

    return this.getById(id);
  }

  async setBaseRate(actor: AuthUser, truckTypeId: string, dto: SetBaseRateDto) {
    if (dto.amountCents < 1) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        TruckErrorCode.INVALID_RATE,
        'amountCents must be greater than 0',
      );
    }

    const truckType = await this.prisma.truckType.findUnique({
      where: { id: truckTypeId },
    });
    if (!truckType) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        TruckErrorCode.NOT_FOUND,
        'Truck type not found',
      );
    }

    const previous = await this.getCurrentRateCents(truckTypeId);
    const effectiveFrom = dto.effectiveFrom ?? new Date();

    const rate = await this.prisma.$transaction(async (tx) => {
      const created = await tx.baseRate.create({
        data: {
          truckTypeId,
          amountCents: dto.amountCents,
          effectiveFrom,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'BASE_RATE_SET',
          entityType: 'BaseRate',
          entityId: created.id,
          metadata: {
            truckTypeId,
            previousAmountCents: previous,
            amountCents: dto.amountCents,
            effectiveFrom: effectiveFrom.toISOString(),
          },
        },
      });

      return created;
    });

    return {
      id: rate.id,
      truckTypeId: rate.truckTypeId,
      amountCents: rate.amountCents,
      effectiveFrom: rate.effectiveFrom,
      createdAt: rate.createdAt,
      // Existing lockedBaseRateCents on dispatches are never mutated
      note: 'In-flight dispatch lockedBaseRateCents are unchanged',
    };
  }

  async listRateHistory(truckTypeId: string) {
    const truckType = await this.prisma.truckType.findUnique({
      where: { id: truckTypeId },
    });
    if (!truckType) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        TruckErrorCode.NOT_FOUND,
        'Truck type not found',
      );
    }

    const rates = await this.prisma.baseRate.findMany({
      where: { truckTypeId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      truckTypeId,
      items: rates.map((r) => ({
        id: r.id,
        amountCents: r.amountCents,
        effectiveFrom: r.effectiveFrom,
        createdAt: r.createdAt,
      })),
    };
  }

  private async assertNoOpenRequests(truckTypeId: string) {
    const openCount = await this.prisma.dispatchRequest.count({
      where: {
        truckTypeId,
        status: { in: OPEN_DISPATCH_STATUSES },
      },
    });
    if (openCount > 0) {
      throw appHttpError(
        HttpStatus.CONFLICT,
        TruckErrorCode.HAS_OPEN_REQUESTS,
        'Cannot deactivate truck type with open dispatch requests',
        { openCount },
      );
    }
  }

  private toPublicTruckType(type: {
    id: string;
    code: string;
    name: string;
    capacity: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    baseRates: Array<{ amountCents: number; effectiveFrom: Date }>;
  }) {
    const current = type.baseRates[0] ?? null;
    return {
      id: type.id,
      code: type.code,
      name: type.name,
      capacity: type.capacity,
      isActive: type.isActive,
      currentRateCents: current?.amountCents ?? null,
      currentRateEffectiveFrom: current?.effectiveFrom ?? null,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
    };
  }
}
