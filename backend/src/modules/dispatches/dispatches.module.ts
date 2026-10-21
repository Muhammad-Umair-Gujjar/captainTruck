import { Module } from '@nestjs/common';
import { OsmModule } from '../osm/osm.module';
import { TruckTypesModule } from '../truck-types/truck-types.module';
import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';

@Module({
  imports: [TruckTypesModule, OsmModule],
  controllers: [DispatchesController],
  providers: [DispatchesService],
  exports: [DispatchesService],
})
export class DispatchesModule {}
