import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CommissionsService } from './commissions.service';
import { ListCommissionsQueryDto } from './dto/list-commissions.query.dto';

@ApiTags('commissions')
@ApiBearerAuth()
@Controller({ path: 'commissions', version: '1' })
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get('mine')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Driver: my commission ledger' })
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCommissionsQueryDto,
  ) {
    return this.commissions.listMine(user, query);
  }

  @Get('admin/summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: per-driver commission totals' })
  summary(@CurrentUser() user: AuthUser) {
    return this.commissions.driverSummary(user);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list commission ledger entries' })
  listAdmin(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCommissionsQueryDto,
  ) {
    return this.commissions.listAdmin(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ledger entry (driver owner or admin)' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.commissions.getById(user, id);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Admin confirms commission received from driver (drivers cannot self-confirm)',
  })
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.commissions.confirmReceived(user, id);
  }
}
