import { Module } from '@nestjs/common';
import { GeocodeService } from './geocode.service';
import { OsmController } from './osm.controller';
import { OsrmService } from './osrm.service';

@Module({
  controllers: [OsmController],
  providers: [OsrmService, GeocodeService],
  exports: [OsrmService, GeocodeService],
})
export class OsmModule {}
