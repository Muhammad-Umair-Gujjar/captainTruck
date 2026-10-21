import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';
import {
  IsEnum,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type!: MessageType;

  @ApiPropertyOptional({ description: 'Required for TEXT / PRESET' })
  @ValidateIf(
    (o: SendMessageDto) =>
      o.type === MessageType.TEXT || o.type === MessageType.PRESET,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body?: string;

  @ApiPropertyOptional({ description: 'Required for IMAGE / VOICE' })
  @ValidateIf(
    (o: SendMessageDto) =>
      o.type === MessageType.IMAGE || o.type === MessageType.VOICE,
  )
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2000)
  mediaUrl?: string;
}
