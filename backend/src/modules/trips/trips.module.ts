import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [PricingModule, RealtimePublisherModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
