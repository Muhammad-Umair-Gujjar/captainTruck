import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class TokenService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.config.jwt.accessSecret, {
      algorithm: 'HS256',
      expiresIn: this.config.jwt
        .accessExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.config.jwt.accessSecret, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
  }
}
