import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectDispatchDto {
  @ApiProperty({
    description: 'Required non-empty rejection reason (visible to customer)',
    example: 'No drivers available in pickup area tonight',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
