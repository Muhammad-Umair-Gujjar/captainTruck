import { Module } from '@nestjs/common';
import { TruckTypesController } from './truck-types.controller';
import { TruckTypesService } from './truck-types.service';

@Module({
  controllers: [TruckTypesController],
  providers: [TruckTypesService],
  exports: [TruckTypesService],
})
export class TruckTypesModule {}
