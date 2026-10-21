import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MediaModule, RealtimePublisherModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
