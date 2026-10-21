import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

@Injectable()
export class HealthService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'captain-truck-api',
      phase: 1,
      nodeEnv: this.config.nodeEnv,
      databaseConfigured: Boolean(this.config.databaseUrl),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
