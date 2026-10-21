import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DispatchStatus,
  PaymentMethod,
  Prisma,
  UserRole,
} from '@prisma/client';
import { DispatchErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { GeocodeService } from '../osm/geocode.service';
import { OsrmService } from '../osm/osrm.service';
import { PrismaService } from '../prisma/prisma.service';
import { TruckTypesService } from '../truck-types/truck-types.service';
import { CUSTOMER_CANCELLABLE, canTransition } from './dispatch-status';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ListDispatchesQueryDto } from './dto/list-dispatches.query.dto';

/**
 * lockedBaseRateCents is snapshotted at **create** time from the truck type's
 * current base rate. Later admin rate changes do not affect this request.
 * Phase 7/8 may use the locked value when computing the final bill.
 */
@Injectable()
export class DispatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly truckTypes: TruckTypesService,
    private readonly osrm: OsrmService,
    private readonly geocode: GeocodeService,
  ) {}

  async create(actor: AuthUser, dto: CreateDispatchDto) {
    if (actor.role !== UserRole.CUSTOMER) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'Only customers can create dispatch requests',
      );
    }

    this.validateLocations(dto);
    this.validatePickupAt(dto.pickupAt);

    const truckType = await this.prisma.truckType.findUnique({
      where: { id: dto.truckTypeId },
    });
    if (!truckType || !truckType.isActive) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.TRUCK_INACTIVE,
        'Truck type not found or inactive',
      );
    }

    const rateCents = await this.truckTypes.getCurrentRateCents(truckType.id);
    if (rateCents === null || rateCents < 1) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.NO_RATE,
        'No active base rate configured for this truck type',
      );
    }

    const asDraft = dto.asDraft === true;
    const status = asDraft
      ? DispatchStatus.DRAFT
      : DispatchStatus.AWAITING_ROUTE_SELECTION;

    const created = await this.prisma.dispatchRequest.create({
      data: {
        customerId: actor.id,
        truckTypeId: truckType.id,
        status,
        truckCount: dto.truckCount,
        pickupAddress: dto.pickupAddress.trim(),
        dropoffAddress: dto.dropoffAddress.trim(),
        pickupLat: dto.pickupLat ?? null,
        pickupLng: dto.pickupLng ?? null,
        dropoffLat: dto.dropoffLat ?? null,
        dropoffLng: dto.dropoffLng ?? null,
        pickupAt: dto.pickupAt ?? null,
        notes: dto.notes?.trim() || null,
        lockedBaseRateCents: rateCents,
        paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
      },
    });

    return this.getById(actor, created.id);
  }

  async listMine(actor: AuthUser, query: ListDispatchesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DispatchRequestWhereInput = {
      customerId: actor.id,
    };
    if (query.status) where.status = query.status;

    if (actor.role === UserRole.ADMIN) {
      // Admin list uses listAdmin
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'Use admin list endpoint',
      );
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.dispatchRequest.count({ where }),
      this.prisma.dispatchRequest.findMany({
        where,
        include: { truckType: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((d) => this.toPublic(d)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listAdmin(query: ListDispatchesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DispatchRequestWhereInput = {};
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.dispatchRequest.count({ where }),
      this.prisma.dispatchRequest.findMany({
        where,
        include: {
          truckType: true,
          customer: {
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((d) => this.toPublic(d)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(actor: AuthUser, id: string) {
    const dispatch = await this.prisma.dispatchRequest.findUnique({
      where: { id },
      include: {
        truckType: true,
        customer: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        routeOptions: true,
      },
    });

    if (!dispatch) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        DispatchErrorCode.NOT_FOUND,
        'Dispatch request not found',
      );
    }

    if (actor.role !== UserRole.ADMIN && dispatch.customerId !== actor.id) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'You cannot access this dispatch request',
      );
    }

    return this.toPublic(dispatch);
  }

  async submitDraft(actor: AuthUser, id: string) {
    const dispatch = await this.findOwnedOrThrow(actor, id);
    this.assertTransition(
      dispatch.status,
      DispatchStatus.AWAITING_ROUTE_SELECTION,
    );

    if (dispatch.status !== DispatchStatus.DRAFT) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_TRANSITION,
        'Only drafts can be submitted for routing',
      );
    }

    await this.prisma.dispatchRequest.update({
      where: { id },
      data: { status: DispatchStatus.AWAITING_ROUTE_SELECTION },
    });

    return this.getById(actor, id);
  }

  async cancel(actor: AuthUser, id: string) {
    const dispatch = await this.findOwnedOrAdmin(actor, id);

    if (!CUSTOMER_CANCELLABLE.includes(dispatch.status)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_TRANSITION,
        `Cannot cancel dispatch in status ${dispatch.status}`,
      );
    }

    this.assertTransition(dispatch.status, DispatchStatus.CANCELLED);

    await this.prisma.dispatchRequest.update({
      where: { id },
      data: { status: DispatchStatus.CANCELLED },
    });

    return this.getById(actor, id);
  }

  /**
   * Generate 2–3 OSRM alternatives; mark fastest as recommended.
   * Prefer stored lat/lng pins; geocode addresses only as fallback.
   */
  async generateRoutes(actor: AuthUser, id: string) {
    const dispatch = await this.findOwnedOrThrow(actor, id);

    if (dispatch.status !== DispatchStatus.AWAITING_ROUTE_SELECTION) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_TRANSITION,
        'Routes can only be generated while awaiting route selection',
      );
    }

    let pickupLat = dispatch.pickupLat;
    let pickupLng = dispatch.pickupLng;
    let dropoffLat = dispatch.dropoffLat;
    let dropoffLng = dispatch.dropoffLng;

    if (pickupLat == null || pickupLng == null) {
      const geo = await this.geocode.geocodeAddress(dispatch.pickupAddress);
      pickupLat = geo.lat;
      pickupLng = geo.lng;
    }
    if (dropoffLat == null || dropoffLng == null) {
      const geo = await this.geocode.geocodeAddress(dispatch.dropoffAddress);
      dropoffLat = geo.lat;
      dropoffLng = geo.lng;
    }

    await this.prisma.dispatchRequest.update({
      where: { id },
      data: { pickupLat, pickupLng, dropoffLat, dropoffLng },
    });

    const routes = await this.osrm.getRoutes(
      pickupLng,
      pickupLat,
      dropoffLng,
      dropoffLat,
    );

    const fastestDuration = Math.min(...routes.map((r) => r.durationSeconds));

    await this.prisma.$transaction(async (tx) => {
      await tx.routeOption.deleteMany({ where: { requestId: id } });
      let recommendedAssigned = false;
      for (const route of routes) {
        const isRecommended =
          !recommendedAssigned && route.durationSeconds === fastestDuration;
        if (isRecommended) recommendedAssigned = true;
        await tx.routeOption.create({
          data: {
            requestId: id,
            polyline: route.polyline,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            aiCostCents: 0,
            isRecommended,
            isSelected: false,
          },
        });
      }
    });

    return this.getById(actor, id);
  }

  /**
   * Select a route option → PENDING_ADMIN.
   * Idempotent: selecting the already-selected route while PENDING_ADMIN succeeds.
   * Re-select only allowed while AWAITING_ROUTE_SELECTION.
   */
  async selectRoute(actor: AuthUser, id: string, routeOptionId: string) {
    const dispatch = await this.findOwnedOrThrow(actor, id);

    const option = await this.prisma.routeOption.findFirst({
      where: { id: routeOptionId, requestId: id },
    });
    if (!option) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        DispatchErrorCode.ROUTE_NOT_FOUND,
        'Route option not found for this dispatch',
      );
    }

    if (dispatch.status === DispatchStatus.PENDING_ADMIN && option.isSelected) {
      return this.getById(actor, id);
    }

    if (dispatch.status !== DispatchStatus.AWAITING_ROUTE_SELECTION) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.ROUTE_LOCKED,
        'Route selection is locked after submission to admin',
      );
    }

    this.assertTransition(dispatch.status, DispatchStatus.PENDING_ADMIN);

    await this.prisma.$transaction(async (tx) => {
      await tx.routeOption.updateMany({
        where: { requestId: id },
        data: { isSelected: false },
      });
      await tx.routeOption.update({
        where: { id: routeOptionId },
        data: { isSelected: true },
      });
      await tx.dispatchRequest.update({
        where: { id },
        data: { status: DispatchStatus.PENDING_ADMIN },
      });
    });

    return this.getById(actor, id);
  }

  private async findOwnedOrThrow(actor: AuthUser, id: string) {
    const dispatch = await this.prisma.dispatchRequest.findUnique({
      where: { id },
    });
    if (!dispatch) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        DispatchErrorCode.NOT_FOUND,
        'Dispatch request not found',
      );
    }
    if (dispatch.customerId !== actor.id) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'You cannot modify this dispatch request',
      );
    }
    return dispatch;
  }

  private async findOwnedOrAdmin(actor: AuthUser, id: string) {
    const dispatch = await this.prisma.dispatchRequest.findUnique({
      where: { id },
    });
    if (!dispatch) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        DispatchErrorCode.NOT_FOUND,
        'Dispatch request not found',
      );
    }
    if (actor.role !== UserRole.ADMIN && dispatch.customerId !== actor.id) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'You cannot modify this dispatch request',
      );
    }
    return dispatch;
  }

  private assertTransition(from: DispatchStatus, to: DispatchStatus) {
    if (!canTransition(from, to)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_TRANSITION,
        `Invalid status transition ${from} → ${to}`,
      );
    }
  }

  private validatePickupAt(pickupAt?: Date) {
    if (!pickupAt) return;
    if (pickupAt.getTime() < Date.now() - 60_000) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.PAST_PICKUP,
        'pickupAt cannot be in the past',
      );
    }
  }

  private validateLocations(dto: CreateDispatchDto) {
    const pickup = dto.pickupAddress.trim().toLowerCase();
    const dropoff = dto.dropoffAddress.trim().toLowerCase();
    if (pickup === dropoff) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.SAME_LOCATIONS,
        'Pickup and dropoff addresses must be different',
      );
    }

    const hasPickupCoords =
      dto.pickupLat !== undefined && dto.pickupLng !== undefined;
    const hasDropoffCoords =
      dto.dropoffLat !== undefined && dto.dropoffLng !== undefined;

    if (
      (dto.pickupLat !== undefined) !== (dto.pickupLng !== undefined) ||
      (dto.dropoffLat !== undefined) !== (dto.dropoffLng !== undefined)
    ) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_COORDS,
        'Latitude and longitude must be provided together',
      );
    }

    if (hasPickupCoords && hasDropoffCoords) {
      if (
        dto.pickupLat === dto.dropoffLat &&
        dto.pickupLng === dto.dropoffLng
      ) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          DispatchErrorCode.SAME_LOCATIONS,
          'Pickup and dropoff coordinates must be different',
        );
      }
    }
  }

  private toPublic(dispatch: {
    id: string;
    customerId: string;
    truckTypeId: string;
    status: DispatchStatus;
    truckCount: number;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLat: number | null;
    pickupLng: number | null;
    dropoffLat: number | null;
    dropoffLng: number | null;
    pickupAt: Date | null;
    notes: string | null;
    lockedBaseRateCents: number | null;
    paymentMethod: PaymentMethod;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    truckType?: {
      id: string;
      code: string;
      name: string;
      capacity: string | null;
    };
    customer?: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
    };
    routeOptions?: unknown[];
  }) {
    return {
      id: dispatch.id,
      customerId: dispatch.customerId,
      truckTypeId: dispatch.truckTypeId,
      status: dispatch.status,
      truckCount: dispatch.truckCount,
      pickupAddress: dispatch.pickupAddress,
      dropoffAddress: dispatch.dropoffAddress,
      pickupLat: dispatch.pickupLat,
      pickupLng: dispatch.pickupLng,
      dropoffLat: dispatch.dropoffLat,
      dropoffLng: dispatch.dropoffLng,
      pickupAt: dispatch.pickupAt,
      notes: dispatch.notes,
      lockedBaseRateCents: dispatch.lockedBaseRateCents,
      paymentMethod: dispatch.paymentMethod,
      rejectionReason: dispatch.rejectionReason,
      createdAt: dispatch.createdAt,
      updatedAt: dispatch.updatedAt,
      truckType: dispatch.truckType ?? null,
      customer: dispatch.customer ?? null,
      routeOptions: dispatch.routeOptions ?? undefined,
      lockNote:
        'lockedBaseRateCents was snapshotted at create time and is immutable',
    };
  }
}
