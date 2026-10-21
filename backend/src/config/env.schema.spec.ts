import { envSchema, toAppConfig } from './env.schema';

describe('envSchema', () => {
  it('accepts development defaults', () => {
    const parsed = envSchema.parse({
      NODE_ENV: 'development',
      PORT: '3000',
    });
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.PORT).toBe(3000);
  });

  it('rejects wildcard CORS in production', () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: 'production',
      CORS_ORIGINS: '*',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects missing JWT secrets in production', () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://admin.example.com',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts production when secrets and CORS are valid', () => {
    const parsed = envSchema.safeParse({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://admin.example.com',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      API_URL: 'https://api.example.com',
    });
    expect(parsed.success).toBe(true);
  });

  it('maps to AppConfig with cors list', () => {
    const config = toAppConfig(
      envSchema.parse({
        NODE_ENV: 'development',
        CORS_ORIGINS: 'http://localhost:5173, http://localhost:3000',
      }),
    );
    expect(config.corsOrigins).toEqual([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
  });
});
