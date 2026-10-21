import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ example: 31.5204 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 74.3587 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ description: 'Heading degrees 0–360' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ description: 'Speed m/s' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speedMps?: number;
}
