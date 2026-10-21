import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { TripsModule } from '../trips/trips.module';
import { RealtimePublisherModule } from './realtime-publisher.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, TripsModule, ChatModule, RealtimePublisherModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
