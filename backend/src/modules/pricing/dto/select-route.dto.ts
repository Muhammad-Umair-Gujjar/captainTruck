import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SelectRouteDto {
  @ApiProperty({
    description:
      'On-device TFLite predicted trip cost in PKR cents (distance-based). Server recomputes the bill.',
    example: 85000,
  })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  aiCostCents!: number;

  @ApiPropertyOptional({
    description: 'Ignored if sent — server bill is authoritative',
  })
  @IsOptional()
  @IsInt()
  clientTotalBillCents?: number;
}
