import { loadEnv } from './load-env';

describe('loadEnv (Phase 1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads test env without requiring JWT secrets', () => {
    const config = loadEnv();
    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toContain('http://localhost:5173');
  });
});
