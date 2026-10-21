import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty({ description: 'Truck type id' })
  @IsString()
  @MinLength(1)
  truckTypeId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  truckCount!: number;

  @ApiProperty({ example: 'Warehouse A, Lahore' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  pickupAddress!: string;

  @ApiProperty({ example: 'Site B, Islamabad' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  dropoffAddress!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng?: number;

  @ApiPropertyOptional({
    description: 'Scheduled pickup time (must be future)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  pickupAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  /** If true, save as DRAFT; otherwise AWAITING_ROUTE_SELECTION */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;
}
