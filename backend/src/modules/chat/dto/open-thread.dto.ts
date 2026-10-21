import { ApiProperty } from '@nestjs/swagger';
import { ChatThreadType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class OpenThreadDto {
  @ApiProperty({ enum: ChatThreadType })
  @IsEnum(ChatThreadType)
  type!: ChatThreadType;
}
