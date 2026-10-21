import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PricingService } from './pricing.service';

class TrainingSamplesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 20;
}

@ApiTags('pricing')
@ApiBearerAuth()
@Controller({ path: 'pricing', version: '1' })
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('training-samples')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Last ≤20 completed trips for on-device TFLite retrain (distance + costs)',
  })
  trainingSamples(@Query() query: TrainingSamplesQueryDto) {
    return this.pricingService.getTrainingSamples(query.limit ?? 20);
  }
}
