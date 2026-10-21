import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyProfile(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (safe fields)' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(user, dto);
  }

  @Patch('me/driver-profile')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Update my driver profile' })
  updateMyDriverProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.usersService.updateMyDriverProfile(user, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list/search users' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: get user by id' })
  getById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: enable/disable/update user status' })
  updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(actor, id, dto);
  }

  @Patch(':id/profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: update user profile fields' })
  adminUpdateProfile(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Patch(':id/driver-profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: update driver profile / docs metadata' })
  adminUpdateDriverProfile(
    @Param('id') id: string,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.usersService.updateDriverProfile(id, dto);
  }
}
