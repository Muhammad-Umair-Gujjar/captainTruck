import { ApiProperty } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTripStatusDto {
  @ApiProperty({
    enum: TripStatus,
    description:
      'Next status: assigned → en_route_pickup → arrived_pickup → in_transit → delivered → completed',
  })
  @IsEnum(TripStatus)
  status!: TripStatus;
}
