import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottleExceptionFilter } from './common/filters/throttle-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { APP_CONFIG } from './config/config.constants';
import { AppConfigModule } from './config/config.module';
import type { AppConfig } from './config/env.schema';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { DispatchesModule } from './modules/dispatches/dispatches.module';
import { OsmModule } from './modules/osm/osm.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RealtimePublisherModule } from './modules/realtime/realtime-publisher.module';
import { RedisModule } from './modules/redis/redis.module';
import { TripsModule } from './modules/trips/trips.module';
import { TruckTypesModule } from './modules/truck-types/truck-types.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    RealtimePublisherModule,
    AuthModule,
    UsersModule,
    TruckTypesModule,
    OsmModule,
    PricingModule,
    PaymentsModule,
    CommissionsModule,
    MediaModule,
    ChatModule,
    TripsModule,
    RealtimeModule,
    DispatchesModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => [
        {
          name: 'default',
          ttl: config.throttle.ttlMs,
          limit: config.throttle.limit,
        },
      ],
    }),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottleExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Nest 11 / path-to-regexp v8 named wildcard
    consumer.apply(CorrelationIdMiddleware).forRoutes('{*path}');
  }
}
