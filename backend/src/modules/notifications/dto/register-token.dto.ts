import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterTokenDto {
  @ApiProperty({ description: 'FCM device registration token' })
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  token!: string;
}
