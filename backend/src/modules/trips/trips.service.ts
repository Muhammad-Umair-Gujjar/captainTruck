import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, TripStatus, UserRole } from '@prisma/client';
import { TripErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.ASSIGNED,
  TripStatus.EN_ROUTE_PICKUP,
  TripStatus.ARRIVED_PICKUP,
  TripStatus.IN_TRANSIT,
  TripStatus.DELIVERED,
];

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

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

    this.assertCanView(actor, trip);
    return this.toPublic(trip);
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
