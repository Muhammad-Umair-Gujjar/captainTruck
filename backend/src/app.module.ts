import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';

/**
 * Phase 0: health only.
 * ConfigModule / typed env schema arrive in Phase 1.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
