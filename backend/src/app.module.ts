import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottleExceptionFilter } from './common/filters/throttle-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { APP_CONFIG } from './config/config.constants';
import { AppConfigModule } from './config/config.module';
import type { AppConfig } from './config/env.schema';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
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
