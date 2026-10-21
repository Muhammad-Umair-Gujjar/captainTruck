import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OsmModule } from '../osm/osm.module';
import { PricingModule } from '../pricing/pricing.module';
import { TripsModule } from '../trips/trips.module';
import { TruckTypesModule } from '../truck-types/truck-types.module';
import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';

@Module({
  imports: [
    TruckTypesModule,
    OsmModule,
    PricingModule,
    TripsModule,
    NotificationsModule,
  ],
  controllers: [DispatchesController],
  providers: [DispatchesService],
  exports: [DispatchesService],
})
export class DispatchesModule {}
