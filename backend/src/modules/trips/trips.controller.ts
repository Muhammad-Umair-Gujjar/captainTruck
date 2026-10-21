import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListTripsQueryDto } from './dto/list-trips.query.dto';
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
}
