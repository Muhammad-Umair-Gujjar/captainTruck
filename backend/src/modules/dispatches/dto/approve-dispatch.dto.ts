import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Multi-truck policy (FYP): one lead driver is assigned regardless of truckCount.
 * truckCount still drives the bill; extra trucks are coordinated offline.
 */
export class ApproveDispatchDto {
  @ApiProperty({
    description: 'Lead driver user id (must be ACTIVE DRIVER, available)',
  })
  @IsString()
  @MinLength(1)
  driverId!: string;

  @ApiPropertyOptional({
    description: 'Optional admin note stored on audit log',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
