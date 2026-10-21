import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum, IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: [
      UserStatus.ACTIVE,
      UserStatus.DISABLED,
      UserStatus.PENDING,
      UserStatus.REJECTED,
    ],
  })
  @IsEnum(UserStatus)
  @IsIn([
    UserStatus.ACTIVE,
    UserStatus.DISABLED,
    UserStatus.PENDING,
    UserStatus.REJECTED,
  ])
  status!: UserStatus;
}
