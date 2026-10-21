import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListTripsQueryDto } from './dto/list-trips.query.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@Controller({ path: 'trips', version: '1' })
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('mine')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'List my trip assignments (driver only)' })
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTripsQueryDto,
  ) {
    return this.tripsService.listMine(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get trip by id (assigned driver, customer owner, or admin)',
  })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.getById(user, id);
  }

  @Post(':id/status')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Advance trip status (driver/admin). Idempotent if already at target.',
  })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.tripsService.updateStatus(user, id, dto);
  }

  @Post(':id/location')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Publish GPS (throttled 3s). Sealed after completed/cancelled.',
  })
  updateLocation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.tripsService.updateLocation(user, id, dto);
  }

  @Get(':id/location')
  @ApiOperation({
    summary: 'Live/last-known location with stale indicator',
  })
  getLocation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.getLocation(user, id);
  }
}
