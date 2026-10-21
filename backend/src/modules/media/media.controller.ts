import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { SignUploadDto } from './dto/sign-upload.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('status')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Whether Cloudinary credentials are configured' })
  status() {
    return { configured: this.mediaService.isConfigured() };
  }

  @Post('sign')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Get signed Cloudinary upload params (direct client upload)',
  })
  sign(@Body() dto: SignUploadDto) {
    return this.mediaService.createUploadSignature(dto);
  }
}
