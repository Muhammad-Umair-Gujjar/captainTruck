import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class SetBaseRateDto {
  @ApiProperty({
    description: 'Base rate in PKR cents (must be > 0)',
    example: 250000,
  })
  @IsInt()
  @Min(1, { message: 'amountCents must be greater than 0' })
  amountCents!: number;

  @ApiPropertyOptional({
    description: 'When this rate becomes effective (default: now)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;
}
