import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../../modules/auth/token.service';
import { AuthErrorCode } from '../constants/error-codes';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { appHttpError } from '../utils/http-error';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearer(request);
    if (!token) {
      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.TOKEN_INVALID,
        'Missing access token',
      );
    }

    try {
      const payload = this.tokens.verifyAccessToken(token);
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch (error: unknown) {
      const name =
        error && typeof error === 'object' && 'name' in error
          ? String((error as { name: string }).name)
          : '';

      if (name === 'TokenExpiredError') {
        throw appHttpError(
          HttpStatus.UNAUTHORIZED,
          AuthErrorCode.TOKEN_EXPIRED,
          'Access token expired',
        );
      }

      throw appHttpError(
        HttpStatus.UNAUTHORIZED,
        AuthErrorCode.TOKEN_INVALID,
        'Invalid access token',
      );
    }
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }
}
