import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  async getHealth() {
    const databaseOk = await this.prisma.isHealthy();

    return {
      status: databaseOk ? 'ok' : 'degraded',
      service: 'captain-truck-api',
      phase: 4,
      nodeEnv: this.config.nodeEnv,
      databaseConfigured: Boolean(this.config.databaseUrl),
      database: databaseOk ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
