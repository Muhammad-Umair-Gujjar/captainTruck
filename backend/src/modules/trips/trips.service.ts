import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DispatchStatus,
  Prisma,
  TripStatus,
  UserRole,
} from '@prisma/client';
import { TripErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { RedisService } from '../redis/redis.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import {
  GPS_ALLOWED,
  GPS_SEALED,
  canTransitionTrip,
} from './trip-status';

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.ASSIGNED,
  TripStatus.EN_ROUTE_PICKUP,
  TripStatus.ARRIVED_PICKUP,
  TripStatus.IN_TRANSIT,
  TripStatus.DELIVERED,
];

/** Min seconds between GPS writes per trip (spam protection). */
export const LOCATION_THROTTLE_SECONDS = 3;

/** Location considered stale after this many ms without update. */
export const LOCATION_STALE_MS = 30_000;

export type LiveLocation = {
  tripId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedMps: number | null;
  updatedAt: string;
  stale: boolean;
  sealed: boolean;
};

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pricing: PricingService,
    private readonly realtime: RealtimePublisher,
  ) {}

  static readonly ACTIVE_STATUSES = ACTIVE_TRIP_STATUSES;

  async listMine(
    actor: AuthUser,
    query: { page?: number; limit?: number; status?: TripStatus },
  ) {
    if (actor.role !== UserRole.DRIVER) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        TripErrorCode.FORBIDDEN,
        'Only drivers can list their assignments',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TripWhereInput = { driverId: actor.id };
    if (query.status) where.status = query.status;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        include: {
          request: {
            include: {
              truckType: true,
              routeOptions: { where: { isSelected: true }, take: 1 },
              customer: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((t) => this.toPublic(t)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getById(actor: AuthUser, id: string) {
    const trip = await this.loadTripOrThrow(id);
    this.assertCanView(actor, trip);
    const liveLocation = await this.getLiveLocation(id, trip);
    return { ...this.toPublic(trip), liveLocation };
  }

  async updateStatus(
    actor: AuthUser,
    id: string,
    dto: UpdateTripStatusDto,
  ) {
    const trip = await this.loadTripOrThrow(id);
    this.assertCanDriveOrAdmin(actor, trip);

    // Idempotent: already at target status
    if (trip.status === dto.status) {
      return this.getById(actor, id);
    }

    if (!canTransitionTrip(trip.status, dto.status)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        TripErrorCode.INVALID_TRANSITION,
        `Invalid trip transition ${trip.status} → ${dto.status}`,
      );
    }

    if (
      actor.role === UserRole.DRIVER &&
      dto.status === TripStatus.CANCELLED
    ) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        TripErrorCode.FORBIDDEN,
        'Drivers cannot cancel trips; contact admin',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        const data: Prisma.TripUpdateInput = { status: dto.status };

        if (
          dto.status === TripStatus.EN_ROUTE_PICKUP &&
          !trip.startedAt
        ) {
          data.startedAt = new Date();
        }

        if (dto.status === TripStatus.COMPLETED) {
          data.completedAt = new Date();
          data.finalBillCents = this.computeFinalBill(trip);
        }

        await tx.trip.update({ where: { id }, data });

        if (dto.status === TripStatus.EN_ROUTE_PICKUP) {
          await tx.dispatchRequest.updateMany({
            where: {
              id: trip.requestId,
              status: DispatchStatus.APPROVED_ASSIGNED,
            },
            data: { status: DispatchStatus.IN_PROGRESS },
          });
        }

        if (dto.status === TripStatus.COMPLETED) {
          await tx.dispatchRequest.updateMany({
            where: {
              id: trip.requestId,
              status: {
                in: [
                  DispatchStatus.APPROVED_ASSIGNED,
                  DispatchStatus.IN_PROGRESS,
                ],
              },
            },
            data: { status: DispatchStatus.COMPLETED },
          });
          await this.markDriverAvailableIfIdle(tx, trip.driverId, id);
          await this.redis.del(this.liveKey(id));
          await this.redis.del(this.throttleKey(id));
        }

        if (dto.status === TripStatus.CANCELLED) {
          await tx.dispatchRequest.updateMany({
            where: {
              id: trip.requestId,
              status: {
                in: [
                  DispatchStatus.APPROVED_ASSIGNED,
                  DispatchStatus.IN_PROGRESS,
                ],
              },
            },
            data: { status: DispatchStatus.CANCELLED },
          });
          await this.markDriverAvailableIfIdle(tx, trip.driverId, id);
          await this.redis.del(this.liveKey(id));
          await this.redis.del(this.throttleKey(id));
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'TRIP_STATUS',
            entityType: 'Trip',
            entityId: id,
            metadata: {
              from: trip.status,
              to: dto.status,
            },
          },
        });
      },
      { timeout: 20_000 },
    );

    const result = await this.getById(actor, id);
    this.realtime.emitTripStatus(id, {
      tripId: id,
      status: dto.status,
      requestId: trip.requestId,
    });
    return result;
  }

  async updateLocation(actor: AuthUser, id: string, dto: UpdateLocationDto) {
    const trip = await this.loadTripOrThrow(id);

    if (actor.role !== UserRole.ADMIN && trip.driverId !== actor.id) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        TripErrorCode.FORBIDDEN,
        'Only the assigned driver can publish location',
      );
    }

    if (GPS_SEALED.includes(trip.status)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        TripErrorCode.GPS_SEALED,
        'Trip is completed/cancelled — GPS writes sealed',
      );
    }

    if (!GPS_ALLOWED.includes(trip.status)) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        TripErrorCode.GPS_SEALED,
        'GPS not allowed in current trip status',
      );
    }

    const acquired = await this.redis.setNxEx(
      this.throttleKey(id),
      '1',
      LOCATION_THROTTLE_SECONDS,
    );
    if (!acquired) {
      throw appHttpError(
        HttpStatus.TOO_MANY_REQUESTS,
        TripErrorCode.LOCATION_THROTTLED,
        `Location updates limited to once per ${LOCATION_THROTTLE_SECONDS}s`,
      );
    }

    const updatedAt = new Date();
    const live: LiveLocation = {
      tripId: id,
      lat: dto.lat,
      lng: dto.lng,
      heading: dto.heading ?? null,
      speedMps: dto.speedMps ?? null,
      updatedAt: updatedAt.toISOString(),
      stale: false,
      sealed: false,
    };

    await this.redis.set(this.liveKey(id), JSON.stringify(live), 86_400);

    await this.prisma.trip.update({
      where: { id },
      data: {
        lastLat: dto.lat,
        lastLng: dto.lng,
        lastLocationAt: updatedAt,
      },
    });

    this.realtime.emitLocation(id, live);
    return live;
  }

  async getLocation(actor: AuthUser, id: string) {
    const trip = await this.loadTripOrThrow(id);
    this.assertCanView(actor, trip);
    return this.getLiveLocation(id, trip);
  }

  /** Used by gateway join authorization. */
  async assertSocketCanJoin(user: AuthUser, tripId: string) {
    const trip = await this.loadTripOrThrow(tripId);
    this.assertCanView(user, trip);
    return trip;
  }

  async countActiveForDriver(
    driverId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.trip.count({
      where: {
        driverId,
        status: { in: ACTIVE_TRIP_STATUSES },
      },
    });
  }

  private async getLiveLocation(
    id: string,
    trip: {
      status: TripStatus;
      lastLat: number | null;
      lastLng: number | null;
      lastLocationAt: Date | null;
    },
  ): Promise<LiveLocation | null> {
    const sealed = GPS_SEALED.includes(trip.status);
    const raw = await this.redis.get(this.liveKey(id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LiveLocation;
        const age = Date.now() - new Date(parsed.updatedAt).getTime();
        return {
          ...parsed,
          stale: age > LOCATION_STALE_MS,
          sealed,
        };
      } catch {
        // fall through to DB last-known
      }
    }

    if (trip.lastLat == null || trip.lastLng == null) {
      return null;
    }

    const updatedAt =
      trip.lastLocationAt?.toISOString() ?? new Date(0).toISOString();
    const age = trip.lastLocationAt
      ? Date.now() - trip.lastLocationAt.getTime()
      : LOCATION_STALE_MS + 1;

    return {
      tripId: id,
      lat: trip.lastLat,
      lng: trip.lastLng,
      heading: null,
      speedMps: null,
      updatedAt,
      stale: age > LOCATION_STALE_MS,
      sealed,
    };
  }

  private computeFinalBill(trip: {
    request: {
      lockedBaseRateCents: number | null;
      truckCount: number;
      routeOptions: Array<{ aiCostCents: number; isSelected: boolean }>;
    };
  }): number {
    const selected = trip.request.routeOptions.find((r) => r.isSelected);
    const bill = this.pricing.computeBill({
      lockedBaseRateCents: trip.request.lockedBaseRateCents,
      aiTripCostCents: selected?.aiCostCents ?? 0,
      truckCount: trip.request.truckCount,
    });
    return bill.totalBillCents;
  }

  private async markDriverAvailableIfIdle(
    tx: Prisma.TransactionClient,
    driverId: string,
    excludeTripId: string,
  ) {
    const remaining = await tx.trip.count({
      where: {
        driverId,
        id: { not: excludeTripId },
        status: { in: ACTIVE_TRIP_STATUSES },
      },
    });
    if (remaining === 0) {
      await tx.driverProfile.updateMany({
        where: { userId: driverId },
        data: { isAvailable: true },
      });
    }
  }

  private async loadTripOrThrow(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            truckType: true,
            routeOptions: { where: { isSelected: true }, take: 1 },
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            driverProfile: true,
          },
        },
      },
    });

    if (!trip) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        TripErrorCode.NOT_FOUND,
        'Trip not found',
      );
    }
    return trip;
  }

  private assertCanView(
    actor: AuthUser,
    trip: { driverId: string; request: { customerId: string } },
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.DRIVER && trip.driverId === actor.id) return;
    if (
      actor.role === UserRole.CUSTOMER &&
      trip.request.customerId === actor.id
    ) {
      return;
    }
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      TripErrorCode.FORBIDDEN,
      'You cannot access this trip',
    );
  }

  private assertCanDriveOrAdmin(
    actor: AuthUser,
    trip: { driverId: string },
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.DRIVER && trip.driverId === actor.id) return;
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      TripErrorCode.FORBIDDEN,
      'Only the assigned driver or admin can update trip status',
    );
  }

  private liveKey(tripId: string) {
    return `trip:loc:${tripId}`;
  }

  private throttleKey(tripId: string) {
    return `trip:loc:throttle:${tripId}`;
  }

  private toPublic(trip: {
    id: string;
    requestId: string;
    driverId: string;
    status: TripStatus;
    finalBillCents: number | null;
    lastLat: number | null;
    lastLng: number | null;
    lastLocationAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    request?: unknown;
    driver?: unknown;
  }) {
    return {
      id: trip.id,
      requestId: trip.requestId,
      driverId: trip.driverId,
      status: trip.status,
      finalBillCents: trip.finalBillCents,
      lastLat: trip.lastLat,
      lastLng: trip.lastLng,
      lastLocationAt: trip.lastLocationAt,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      request: trip.request ?? undefined,
      driver: trip.driver ?? undefined,
    };
  }
}
