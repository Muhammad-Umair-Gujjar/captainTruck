import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginLockoutService } from './login-lockout.service';
import { TokenService } from './token.service';

type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly lockout: LoginLockoutService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const email = this.normalizeEmail(dto.email);
    await this.assertUniqueIdentity(email, dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone?.trim() || null,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const lock = this.lockout.isLocked(email);
    if (lock.locked) {
      throw appHttpError(
        HttpStatus.TOO_MANY_REQUESTS,
        AuthErrorCode.LOCKED_OUT,
        'Account temporarily locked due to failed login attempts',
        { retryAfterSeconds: lock.retryAfterSeconds },
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      this.lockout.recordFailure(email);
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      const afterFail = this.lockout.recordFailure(email);
      if (afterFail.locked) {
        throw appHttpError(
          HttpStatus.TOO_MANY_REQUESTS,
          AuthErrorCode.LOCKED_OUT,
          'Account temporarily locked due to failed login attempts',
          { retryAfterSeconds: afterFail.retryAfterSeconds },
        );
      }
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    this.assertCanLogin(user);
    this.lockout.clear(email);

    const tokens = await this.issueTokenPair(user);
    return { user: this.toSafeUser(user), ...tokens };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.INVALID_REFRESH,
        'Invalid refresh token',
      );
    }

    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.REFRESH_REUSE,
        'Refresh token reuse detected; session family revoked',
      );
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.INVALID_REFRESH,
        'Refresh token expired',
      );
    }

    this.assertCanLogin(existing.user);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(existing.user, existing.familyId);
    return { user: this.toSafeUser(existing.user), ...tokens };
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.TOKEN_INVALID,
        'User not found',
      );
    }
    this.assertCanLogin(user);
    return this.toSafeUser(user);
  }

  async createDriver(dto: CreateDriverDto) {
    const email = this.normalizeEmail(dto.email);
    await this.assertUniqueIdentity(email, dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone?.trim() || null,
        fullName: dto.fullName.trim(),
        passwordHash,
        role: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
        driverProfile: {
          create: {
            licenseNumber: dto.licenseNumber?.trim() || null,
            vehiclePlate: dto.vehiclePlate?.trim() || null,
            isAvailable: true,
          },
        },
      },
      include: { driverProfile: true },
    });

    return {
      user: this.toSafeUser(user),
      driverProfile: user.driverProfile,
    };
  }

  private async issueTokenPair(
    user: User,
    familyId: string = randomUUID(),
  ): Promise<TokenPair> {
    const accessToken = this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.refreshExpiryDate();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwt.accessExpiresIn,
      tokenType: 'Bearer',
    };
  }

  private refreshExpiryDate(): Date {
    const raw = this.config.jwt.refreshExpiresIn;
    const match = /^(\d+)([smhd])$/.exec(raw);
    const amount = match ? Number(match[1]) : 7;
    const unit = match?.[2] ?? 'd';
    const ms =
      unit === 's'
        ? amount * 1000
        : unit === 'm'
          ? amount * 60_000
          : unit === 'h'
            ? amount * 3_600_000
            : amount * 86_400_000;
    return new Date(Date.now() + ms);
  }

  private assertCanLogin(user: User): void {
    if (user.deletedAt || user.status === UserStatus.DISABLED) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        AuthErrorCode.ACCOUNT_DISABLED,
        'Account is disabled',
      );
    }
    if (
      user.role === UserRole.DRIVER &&
      (user.status === UserStatus.PENDING ||
        user.status === UserStatus.REJECTED)
    ) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        AuthErrorCode.ACCOUNT_DISABLED,
        `Driver account is ${user.status.toLowerCase()}`,
      );
    }
  }

  private async assertUniqueIdentity(email: string, phone?: string) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw appHttpError(
        HttpStatus.CONFLICT,
        AuthErrorCode.EMAIL_TAKEN,
        'Email is already registered',
      );
    }

    if (phone?.trim()) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: phone.trim() },
      });
      if (existingPhone) {
        throw appHttpError(
          HttpStatus.CONFLICT,
          AuthErrorCode.PHONE_TAKEN,
          'Phone is already registered',
        );
      }
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
