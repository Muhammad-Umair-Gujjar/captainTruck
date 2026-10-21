import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChatService } from './chat.service';
import { ListMessagesQueryDto } from './dto/list-messages.query.dto';
import { OpenThreadDto } from './dto/open-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads/mine')
  @ApiOperation({ summary: 'List my chat threads' })
  listMine(@CurrentUser() user: AuthUser) {
    return this.chatService.listMine(user);
  }

  @Post('trips/:tripId/threads')
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get or create trip chat thread (DRIVER_CUSTOMER or DRIVER_ADMIN)',
  })
  openThread(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: OpenThreadDto,
  ) {
    return this.chatService.openThreadForTrip(user, tripId, dto.type);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get thread by id' })
  getThread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.getThread(user, id);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'List messages (cursor pagination, newest first)' })
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chatService.listMessages(user, id, query);
  }

  @Post('threads/:id/messages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send message (text/image/voice/preset)' })
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user, id, dto);
  }

  @Post('messages/:id/report')
  @ApiOperation({ summary: 'Flag message for abuse review' })
  report(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.reportMessage(user, id);
  }
}
