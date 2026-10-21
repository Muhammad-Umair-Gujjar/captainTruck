import type { AppConfig } from '../../config/env.schema';
import type { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when database is healthy', async () => {
    const config = {
      nodeEnv: 'test',
      databaseUrl: 'postgresql://example',
    } as AppConfig;

    const prisma = {
      isHealthy: jest.fn().mockResolvedValue(true),
    } as unknown as PrismaService;

    const service = new HealthService(config, prisma);
    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('captain-truck-api');
    expect(result.phase).toBe(6);
    expect(result.database).toBe('up');
    expect(result.databaseConfigured).toBe(true);
  });

  it('returns degraded when database is down', async () => {
    const config = {
      nodeEnv: 'test',
      databaseUrl: undefined,
    } as AppConfig;

    const prisma = {
      isHealthy: jest.fn().mockResolvedValue(false),
    } as unknown as PrismaService;

    const service = new HealthService(config, prisma);
    const result = await service.getHealth();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
