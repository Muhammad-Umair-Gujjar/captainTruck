import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { ChatRetentionService } from './chat-retention.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MediaModule, RealtimePublisherModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRetentionService],
  exports: [ChatService, ChatRetentionService],
})
export class ChatModule {}
