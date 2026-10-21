import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegisterTokenDto } from './dto/register-token.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('status')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Whether FCM credentials are configured on the server',
  })
  status() {
    return { configured: this.notifications.isConfigured() };
  }

  @Get('tokens')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List my registered FCM device tokens' })
  listTokens(@CurrentUser() user: AuthUser) {
    return this.notifications.listMyTokens(user);
  }

  @Post('tokens')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register an FCM device token for push' })
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterTokenDto) {
    return this.notifications.registerToken(user, dto.token);
  }

  @Delete('tokens')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Unregister an FCM device token' })
  unregister(@CurrentUser() user: AuthUser, @Body() dto: RegisterTokenDto) {
    return this.notifications.unregisterToken(user, dto.token);
  }
}
