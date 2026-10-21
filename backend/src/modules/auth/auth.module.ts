import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginLockoutService } from './login-lockout.service';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LoginLockoutService, TokenService],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
