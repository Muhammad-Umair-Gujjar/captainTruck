import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status', () => {
    const service = new HealthService();
    const result = service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('captain-truck-api');
    expect(result.phase).toBe(0);
    expect(typeof result.uptimeSeconds).toBe('number');
  });
});
