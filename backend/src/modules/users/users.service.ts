import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, TripStatus, User, UserRole, UserStatus } from '@prisma/client';
import { UserErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.ASSIGNED,
  TripStatus.EN_ROUTE_PICKUP,
  TripStatus.ARRIVED_PICKUP,
  TripStatus.IN_TRANSIT,
  TripStatus.DELIVERED,
];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(actor: AuthUser) {
    return this.getUserById(actor.id);
  }

  async updateMyProfile(actor: AuthUser, dto: UpdateProfileDto) {
    return this.updateProfile(actor.id, dto);
  }

  async updateMyDriverProfile(actor: AuthUser, dto: UpdateDriverProfileDto) {
    if (actor.role !== UserRole.DRIVER) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        UserErrorCode.NOT_A_DRIVER,
        'Only drivers can update driver profile',
      );
    }
    // Drivers cannot set adminNotes
    const safe: UpdateDriverProfileDto = {
      licenseNumber: dto.licenseNumber,
      vehiclePlate: dto.vehiclePlate,
      isAvailable: dto.isAvailable,
      docsUrls: dto.docsUrls,
    };
    return this.updateDriverProfile(actor.id, safe);
  }

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { driverProfile: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: users.map((u) => this.toPublicUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { driverProfile: true },
    });
    if (!user) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        UserErrorCode.NOT_FOUND,
        'User not found',
      );
    }
    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (
      dto.fullName === undefined &&
      dto.email === undefined &&
      dto.phone === undefined
    ) {
      return this.getUserById(userId);
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) {
      const name = dto.fullName.trim();
      if (name.length < 2) {
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          UserErrorCode.INVALID_STATUS,
          'fullName must be at least 2 characters',
        );
      }
      data.fullName = name;
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const taken = await this.prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (taken) {
        throw appHttpError(
          HttpStatus.CONFLICT,
          UserErrorCode.EMAIL_TAKEN,
          'Email is already registered',
        );
      }
      data.email = email;
    }

    if (dto.phone !== undefined) {
      const phone =
        dto.phone === null || dto.phone === '' ? null : dto.phone.trim();
      if (phone) {
        const taken = await this.prisma.user.findFirst({
          where: { phone, NOT: { id: userId } },
        });
        if (taken) {
          throw appHttpError(
            HttpStatus.CONFLICT,
            UserErrorCode.PHONE_TAKEN,
            'Phone is already registered',
          );
        }
      }
      data.phone = phone;
    }

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getUserById(userId);
  }

  async updateDriverProfile(userId: string, dto: UpdateDriverProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { driverProfile: true },
    });
    if (!user || user.role !== UserRole.DRIVER) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        UserErrorCode.NOT_A_DRIVER,
        'User is not a driver',
      );
    }

    const profileData: Prisma.DriverProfileUpdateInput = {};
    if (dto.licenseNumber !== undefined) {
      profileData.licenseNumber = dto.licenseNumber?.trim() || null;
    }
    if (dto.vehiclePlate !== undefined) {
      profileData.vehiclePlate = dto.vehiclePlate?.trim() || null;
    }
    if (dto.isAvailable !== undefined) {
      profileData.isAvailable = dto.isAvailable;
    }
    if (dto.docsUrls !== undefined) {
      profileData.docsUrls = dto.docsUrls;
    }
    if (dto.adminNotes !== undefined) {
      profileData.adminNotes = dto.adminNotes?.trim() || null;
    }

    if (!user.driverProfile) {
      await this.prisma.driverProfile.create({
        data: {
          userId,
          licenseNumber:
            typeof dto.licenseNumber === 'string'
              ? dto.licenseNumber.trim()
              : null,
          vehiclePlate:
            typeof dto.vehiclePlate === 'string'
              ? dto.vehiclePlate.trim()
              : null,
          isAvailable: dto.isAvailable ?? true,
          docsUrls: dto.docsUrls ?? [],
          adminNotes:
            typeof dto.adminNotes === 'string' ? dto.adminNotes.trim() : null,
        },
      });
    } else if (Object.keys(profileData).length > 0) {
      await this.prisma.driverProfile.update({
        where: { userId },
        data: profileData,
      });
    }

    return this.getUserById(userId);
  }

  async updateStatus(
    actor: AuthUser,
    targetId: string,
    dto: UpdateUserStatusDto,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
    });
    if (!target) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        UserErrorCode.NOT_FOUND,
        'User not found',
      );
    }

    if (target.role === UserRole.ADMIN && dto.status === UserStatus.DISABLED) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          deletedAt: null,
          NOT: { id: target.id },
        },
      });
      if (otherActiveAdmins === 0) {
        throw appHttpError(
          HttpStatus.CONFLICT,
          UserErrorCode.LAST_ADMIN,
          'Cannot disable the last active admin',
        );
      }
    }

    if (target.id === actor.id && dto.status === UserStatus.DISABLED) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        UserErrorCode.INVALID_STATUS,
        'You cannot disable your own account',
      );
    }

    if (target.role === UserRole.DRIVER && dto.status === UserStatus.DISABLED) {
      const activeTrips = await this.prisma.trip.count({
        where: {
          driverId: target.id,
          status: { in: ACTIVE_TRIP_STATUSES },
        },
      });
      if (activeTrips > 0) {
        throw appHttpError(
          HttpStatus.CONFLICT,
          UserErrorCode.ACTIVE_TRIPS,
          'Cannot disable driver with active trips',
          { activeTrips },
        );
      }
    }

    await this.prisma.user.update({
      where: { id: target.id },
      data: { status: dto.status },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'USER_STATUS_UPDATE',
        entityType: 'User',
        entityId: target.id,
        metadata: {
          from: target.status,
          to: dto.status,
        },
      },
    });

    return this.getUserById(target.id);
  }

  private toPublicUser(
    user: User & {
      driverProfile?: {
        id: string;
        licenseNumber: string | null;
        vehiclePlate: string | null;
        isAvailable: boolean;
        docsUrls: string[];
        adminNotes: string | null;
      } | null;
    },
  ) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      driverProfile: user.driverProfile
        ? {
            id: user.driverProfile.id,
            licenseNumber: user.driverProfile.licenseNumber,
            vehiclePlate: user.driverProfile.vehiclePlate,
            isAvailable: user.driverProfile.isAvailable,
            docsUrls: user.driverProfile.docsUrls,
            adminNotes: user.driverProfile.adminNotes,
          }
        : null,
    };
  }
}
