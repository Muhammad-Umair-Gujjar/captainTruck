import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DispatchStatus,
  PaymentMethod,
  Prisma,
  TripStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { DispatchErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { NotificationsService } from '../notifications/notifications.service';
import { GeocodeService } from '../osm/geocode.service';
import { OsrmService } from '../osm/osrm.service';
import { SelectRouteDto } from '../pricing/dto/select-route.dto';
import { PricingService } from '../pricing/pricing.service';
import type { BillBreakdown } from '../pricing/pricing.types';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { TruckTypesService } from '../truck-types/truck-types.service';
import {
  ADMIN_CANCELLABLE,
  CUSTOMER_CANCELLABLE,
  canTransition,
} from './dispatch-status';
import { ApproveDispatchDto } from './dto/approve-dispatch.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ListDispatchesQueryDto } from './dto/list-dispatches.query.dto';
import { RejectDispatchDto } from './dto/reject-dispatch.dto';

/**
 * lockedBaseRateCents is snapshotted at **create** time from the truck type's
 * current base rate. Later admin rate changes do not affect this request.
 * Bill uses locked base + on-device AI cost (Phase 8).
 *
 * Multi-truck (truckCount > 1): one lead driver is assigned (FYP policy).
 */
@Injectable()
export class DispatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly truckTypes: TruckTypesService,
    private readonly osrm: OsrmService,
    private readonly geocode: GeocodeService,
    private readonly pricing: PricingService,
    private readonly trips: TripsService,
    private readonly notifications: NotificationsService,
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
        trip: {
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                driverProfile: {
                  select: {
                    vehiclePlate: true,
                    licenseNumber: true,
                    isAvailable: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dispatch) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        DispatchErrorCode.NOT_FOUND,
        'Dispatch request not found',
      );
    }

    this.assertCanViewDispatch(actor, dispatch);
    return this.toPublic(dispatch);
  }

  /** Admin queue of requests waiting for review. */
  async listPendingAdmin(query: ListDispatchesQueryDto) {
    return this.listAdmin({
      ...query,
      status: DispatchStatus.PENDING_ADMIN,
    });
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

    const allowed =
      actor.role === UserRole.ADMIN ? ADMIN_CANCELLABLE : CUSTOMER_CANCELLABLE;

    if (!allowed.includes(dispatch.status)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.INVALID_TRANSITION,
        `Cannot cancel dispatch in status ${dispatch.status}`,
      );
    }

    this.assertTransition(dispatch.status, DispatchStatus.CANCELLED);

    await this.prisma.$transaction(async (tx) => {
      const existingTrip = await tx.trip.findUnique({
        where: { requestId: id },
      });
      if (existingTrip && existingTrip.status !== TripStatus.CANCELLED) {
        await tx.trip.update({
          where: { id: existingTrip.id },
          data: { status: TripStatus.CANCELLED },
        });
        await this.maybeMarkDriverAvailable(tx, existingTrip.driverId);
      }

      await tx.dispatchRequest.update({
        where: { id },
        data: { status: DispatchStatus.CANCELLED },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'DISPATCH_CANCEL',
          entityType: 'DispatchRequest',
          entityId: id,
          metadata: { previousStatus: dispatch.status },
        },
      });
    });

    return this.getById(actor, id);
  }

  /**
   * Approve + assign lead driver atomically → APPROVED_ASSIGNED + Trip(ASSIGNED).
   * Uses row lock to prevent double-assign races between admins.
   */
  async approve(actor: AuthUser, id: string, dto: ApproveDispatchDto) {
    if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'Only admins can approve dispatches',
      );
    }

    // Optimistic status guard (Neon pooler-safe; avoids FOR UPDATE disconnects)
    await this.prisma.$transaction(
      async (tx) => {
        const dispatch = await tx.dispatchRequest.findUnique({
          where: { id },
          include: {
            routeOptions: true,
            trip: true,
          },
        });

        if (!dispatch) {
          throw appHttpError(
            HttpStatus.NOT_FOUND,
            DispatchErrorCode.NOT_FOUND,
            'Dispatch request not found',
          );
        }

        if (dispatch.trip) {
          throw appHttpError(
            HttpStatus.CONFLICT,
            DispatchErrorCode.ALREADY_ASSIGNED,
            'Dispatch already has an assignment',
          );
        }

        if (dispatch.status !== DispatchStatus.PENDING_ADMIN) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.INVALID_TRANSITION,
            `Cannot approve dispatch in status ${dispatch.status}`,
          );
        }

        this.assertTransition(
          dispatch.status,
          DispatchStatus.APPROVED_ASSIGNED,
        );

        const selected = dispatch.routeOptions.find((r) => r.isSelected);
        if (!selected) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.NO_SELECTED_ROUTE,
            'Cannot approve without a selected route',
          );
        }

        const driver = await tx.user.findUnique({
          where: { id: dto.driverId },
          include: { driverProfile: true },
        });

        if (!driver || driver.role !== UserRole.DRIVER || driver.deletedAt) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.DRIVER_NOT_FOUND,
            'Driver not found',
          );
        }

        if (driver.status !== UserStatus.ACTIVE) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.DRIVER_DISABLED,
            'Driver account is not active',
          );
        }

        const busyCount = await this.trips.countActiveForDriver(
          dto.driverId,
          tx,
        );
        if (busyCount > 0) {
          throw appHttpError(
            HttpStatus.CONFLICT,
            DispatchErrorCode.DRIVER_BUSY,
            'Driver already has an active trip assignment',
          );
        }

        if (!driver.driverProfile?.isAvailable) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.DRIVER_UNAVAILABLE,
            'Driver is marked unavailable',
          );
        }

        const claimed = await tx.dispatchRequest.updateMany({
          where: { id, status: DispatchStatus.PENDING_ADMIN },
          data: {
            status: DispatchStatus.APPROVED_ASSIGNED,
            rejectionReason: null,
          },
        });
        if (claimed.count !== 1) {
          throw appHttpError(
            HttpStatus.CONFLICT,
            DispatchErrorCode.ALREADY_ASSIGNED,
            'Dispatch was claimed by another admin',
          );
        }

        await tx.trip.create({
          data: {
            requestId: id,
            driverId: dto.driverId,
            status: TripStatus.ASSIGNED,
          },
        });

        await tx.driverProfile.update({
          where: { userId: dto.driverId },
          data: { isAvailable: false },
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'DISPATCH_APPROVE_ASSIGN',
            entityType: 'DispatchRequest',
            entityId: id,
            metadata: {
              driverId: dto.driverId,
              vehiclePlate: driver.driverProfile.vehiclePlate,
              truckCount: dispatch.truckCount,
              multiTruckPolicy: 'one_lead_driver',
              note: dto.note?.trim() || null,
            },
          },
        });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    const result = await this.getById(actor, id);
    const tripId =
      result.trip &&
      typeof result.trip === 'object' &&
      result.trip !== null &&
      'id' in result.trip
        ? String((result.trip as { id: string }).id)
        : undefined;
    this.notifications.notifyDispatchAssigned({
      customerId: result.customerId,
      driverId: dto.driverId,
      dispatchId: id,
      tripId,
    });
    return result;
  }

  /**
   * Reject pending (or unassign+reject approved) with required reason.
   */
  async reject(actor: AuthUser, id: string, dto: RejectDispatchDto) {
    if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        DispatchErrorCode.FORBIDDEN,
        'Only admins can reject dispatches',
      );
    }

    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        DispatchErrorCode.REJECT_REASON_REQUIRED,
        'Rejection reason is required (min 3 characters)',
      );
    }

    let customerId = '';
    let driverId: string | null = null;

    await this.prisma.$transaction(
      async (tx) => {
        const dispatch = await tx.dispatchRequest.findUnique({
          where: { id },
          include: { trip: true },
        });

        if (!dispatch) {
          throw appHttpError(
            HttpStatus.NOT_FOUND,
            DispatchErrorCode.NOT_FOUND,
            'Dispatch request not found',
          );
        }

        if (
          dispatch.status !== DispatchStatus.PENDING_ADMIN &&
          dispatch.status !== DispatchStatus.APPROVED_ASSIGNED
        ) {
          throw appHttpError(
            HttpStatus.BAD_REQUEST,
            DispatchErrorCode.INVALID_TRANSITION,
            `Cannot reject dispatch in status ${dispatch.status}`,
          );
        }

        this.assertTransition(dispatch.status, DispatchStatus.REJECTED);

        customerId = dispatch.customerId;
        driverId = dispatch.trip?.driverId ?? null;

        const claimed = await tx.dispatchRequest.updateMany({
          where: {
            id,
            status: { in: [dispatch.status] },
          },
          data: {
            status: DispatchStatus.REJECTED,
            rejectionReason: reason,
          },
        });
        if (claimed.count !== 1) {
          throw appHttpError(
            HttpStatus.CONFLICT,
            DispatchErrorCode.INVALID_TRANSITION,
            'Dispatch status changed concurrently',
          );
        }

        if (dispatch.trip && dispatch.trip.status !== TripStatus.CANCELLED) {
          await tx.trip.update({
            where: { id: dispatch.trip.id },
            data: { status: TripStatus.CANCELLED },
          });
          await this.maybeMarkDriverAvailable(tx, dispatch.trip.driverId);
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'DISPATCH_REJECT',
            entityType: 'DispatchRequest',
            entityId: id,
            metadata: {
              reason,
              previousStatus: dispatch.status,
              clearedTripId: dispatch.trip?.id ?? null,
            },
          },
        });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    this.notifications.notifyDispatchRejected({
      customerId,
      driverId,
      dispatchId: id,
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
   * Select a route option + persist on-device AI cost → PENDING_ADMIN.
   * Server recomputes bill; clientTotalBillCents is ignored.
   * Idempotent: same selected route while PENDING_ADMIN returns current bill.
   */
  async selectRoute(
    actor: AuthUser,
    id: string,
    routeOptionId: string,
    dto: SelectRouteDto,
  ) {
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

    const { flaggedOutlier } = this.pricing.validateAiCostCents(
      dto.aiCostCents,
      option.distanceMeters,
    );

    this.assertTransition(dispatch.status, DispatchStatus.PENDING_ADMIN);

    await this.prisma.$transaction(async (tx) => {
      await tx.routeOption.updateMany({
        where: { requestId: id },
        data: { isSelected: false },
      });
      await tx.routeOption.update({
        where: { id: routeOptionId },
        data: {
          isSelected: true,
          aiCostCents: dto.aiCostCents,
        },
      });
      await tx.dispatchRequest.update({
        where: { id },
        data: { status: DispatchStatus.PENDING_ADMIN },
      });
    });

    const result = await this.getById(actor, id);
    return {
      ...result,
      billBreakdown: this.pricing.computeBill({
        lockedBaseRateCents: dispatch.lockedBaseRateCents,
        aiTripCostCents: dto.aiCostCents,
        truckCount: dispatch.truckCount,
        flaggedOutlier,
      }),
      clientTotalIgnored: dto.clientTotalBillCents ?? null,
    };
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

  private assertCanViewDispatch(
    actor: AuthUser,
    dispatch: {
      customerId: string;
      trip?: { driverId: string } | null;
    },
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (dispatch.customerId === actor.id) return;
    if (
      actor.role === UserRole.DRIVER &&
      dispatch.trip?.driverId === actor.id
    ) {
      return;
    }
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      DispatchErrorCode.FORBIDDEN,
      'You cannot access this dispatch request',
    );
  }

  private async maybeMarkDriverAvailable(
    tx: Prisma.TransactionClient,
    driverId: string,
  ) {
    const remaining = await this.trips.countActiveForDriver(driverId, tx);
    if (remaining === 0) {
      await tx.driverProfile.updateMany({
        where: { userId: driverId },
        data: { isAvailable: true },
      });
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
    routeOptions?: Array<{
      isSelected: boolean;
      aiCostCents: number;
      distanceMeters: number;
    }>;
    trip?: unknown;
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
      trip: dispatch.trip ?? null,
      billBreakdown: this.buildBillBreakdown(dispatch),
      lockNote:
        'lockedBaseRateCents was snapshotted at create time and is immutable',
      pricingNote:
        'totalBillCents is computed server-side; client totals are ignored',
      assignmentNote:
        'truckCount > 1 still assigns one lead driver (FYP multi-truck policy)',
    };
  }

  private buildBillBreakdown(dispatch: {
    lockedBaseRateCents: number | null;
    truckCount: number;
    routeOptions?: Array<{
      isSelected: boolean;
      aiCostCents: number;
      distanceMeters: number;
    }>;
  }): BillBreakdown | null {
    const selected = dispatch.routeOptions?.find((r) => r.isSelected);
    if (!selected || dispatch.lockedBaseRateCents == null) {
      return null;
    }
    try {
      const { flaggedOutlier } = this.pricing.validateAiCostCents(
        selected.aiCostCents,
        selected.distanceMeters,
      );
      return this.pricing.computeBill({
        lockedBaseRateCents: dispatch.lockedBaseRateCents,
        aiTripCostCents: selected.aiCostCents,
        truckCount: dispatch.truckCount,
        flaggedOutlier,
      });
    } catch {
      return null;
    }
  }
}
