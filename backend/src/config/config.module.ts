import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from './config.constants';
import { loadEnv } from './load-env';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => loadEnv(),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
