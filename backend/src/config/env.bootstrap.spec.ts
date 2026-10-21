import { loadBootstrapEnv } from './env.bootstrap';

describe('loadBootstrapEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to development and port 3000', () => {
    const env = loadBootstrapEnv();
    expect(env.nodeEnv).toBe('development');
    expect(env.port).toBe(3000);
  });

  it('defaults invalid NODE_ENV to development', () => {
    process.env.NODE_ENV = 'staging';
    const env = loadBootstrapEnv();
    expect(env.nodeEnv).toBe('development');
  });

  it('throws on invalid PORT', () => {
    process.env.PORT = 'not-a-port';
    expect(() => loadBootstrapEnv()).toThrow(/Invalid PORT/);
  });
});
