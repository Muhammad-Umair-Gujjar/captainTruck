import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GeocodeService } from './geocode.service';

class AutocompleteQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

@ApiTags('osm')
@ApiBearerAuth()
@Controller({ path: 'osm', version: '1' })
export class OsmController {
  constructor(private readonly geocode: GeocodeService) {}

  @Get('autocomplete')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Address autocomplete (Photon proxy)',
  })
  autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.geocode.autocomplete(query.q, query.limit ?? 5);
  }
}
