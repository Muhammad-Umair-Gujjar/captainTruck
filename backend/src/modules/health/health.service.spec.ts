import type { AppConfig } from '../../config/env.schema';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status for Phase 1', () => {
    const config = {
      nodeEnv: 'test',
      databaseUrl: 'postgresql://example',
    } as AppConfig;

    const service = new HealthService(config);
    const result = service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('captain-truck-api');
    expect(result.phase).toBe(1);
    expect(result.databaseConfigured).toBe(true);
    expect(typeof result.uptimeSeconds).toBe('number');
  });
});
