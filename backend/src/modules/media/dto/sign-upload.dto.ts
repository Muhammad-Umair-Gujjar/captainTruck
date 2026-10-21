import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SignUploadDto {
  @ApiPropertyOptional({
    enum: ['image', 'video', 'raw'],
    default: 'image',
    description: 'Use video for voice notes',
  })
  @IsOptional()
  @IsIn(['image', 'video', 'raw'])
  resourceType?: 'image' | 'video' | 'raw';

  @ApiPropertyOptional({ example: 'captain-truck/chat' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  folder?: string;
}
