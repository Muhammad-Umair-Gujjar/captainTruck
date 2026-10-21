import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateTruckTypeDto } from './dto/create-truck-type.dto';
import { SetBaseRateDto } from './dto/set-base-rate.dto';
import { UpdateTruckTypeDto } from './dto/update-truck-type.dto';
import { TruckTypesService } from './truck-types.service';

@ApiTags('truck-types')
@Controller({ path: 'truck-types', version: '1' })
export class TruckTypesController {
  constructor(private readonly truckTypesService: TruckTypesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active truck types with current rates' })
  listActive() {
    return this.truckTypesService.listActiveForCustomers();
  }

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list all truck types (incl. inactive)' })
  listAll() {
    return this.truckTypesService.listAllAdmin();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get truck type (active only for public)' })
  getById(@Param('id') id: string) {
    return this.truckTypesService.getById(id, true);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: create truck type' })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTruckTypeDto) {
    return this.truckTypesService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: update truck type / deactivate' })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTruckTypeDto,
  ) {
    return this.truckTypesService.update(actor, id, dto);
  }

  @Post(':id/rates')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin: set new base rate (history; does not mutate locked requests)',
  })
  setRate(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetBaseRateDto,
  ) {
    return this.truckTypesService.setBaseRate(actor, id, dto);
  }

  @Get(':id/rates')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: base rate history' })
  rateHistory(@Param('id') id: string) {
    return this.truckTypesService.listRateHistory(id);
  }
}
