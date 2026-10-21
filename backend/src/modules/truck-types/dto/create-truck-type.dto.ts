import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTruckTypeDto {
  @ApiProperty({ example: 'XL' })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'code must be uppercase letters, numbers, or underscore',
  })
  code!: string;

  @ApiProperty({ example: 'Extra Large Truck' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '10-15 ton' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  capacity?: string;

  @ApiPropertyOptional({
    description: 'Initial base rate in cents (PKR)',
    example: 500000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  initialRateCents?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
