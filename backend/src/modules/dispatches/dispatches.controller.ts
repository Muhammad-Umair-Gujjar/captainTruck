import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SelectRouteDto } from '../pricing/dto/select-route.dto';
import { DispatchesService } from './dispatches.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ListDispatchesQueryDto } from './dto/list-dispatches.query.dto';

@ApiTags('dispatches')
@ApiBearerAuth()
@Controller({ path: 'dispatches', version: '1' })
export class DispatchesController {
  constructor(private readonly dispatchesService: DispatchesService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Create dispatch request (locks current base rate at create)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDispatchDto) {
    return this.dispatchesService.create(user, dto);
  }

  @Get('mine')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List my dispatch requests' })
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListDispatchesQueryDto,
  ) {
    return this.dispatchesService.listMine(user, query);
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list all dispatch requests' })
  listAdmin(@Query() query: ListDispatchesQueryDto) {
    return this.dispatchesService.listAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispatch by id (owner or admin)' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatchesService.getById(user, id);
  }

  @Post(':id/submit')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Submit draft → awaiting_route_selection' })
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatchesService.submitDraft(user, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel dispatch (customer owner or admin)' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatchesService.cancel(user, id);
  }

  @Post(':id/routes/generate')
  @Roles(UserRole.CUSTOMER)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Generate 2–3 OSRM route alternatives (fastest = recommended)',
  })
  generateRoutes(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dispatchesService.generateRoutes(user, id);
  }

  @Post(':id/routes/:routeOptionId/select')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary:
      'Select route + AI cost → pending_admin; server computes bill (client total ignored)',
  })
  selectRoute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('routeOptionId') routeOptionId: string,
    @Body() dto: SelectRouteDto,
  ) {
    return this.dispatchesService.selectRoute(user, id, routeOptionId, dto);
  }
}
