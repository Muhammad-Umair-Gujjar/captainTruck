/**
 * Phase 0 bootstrap env checks (full Zod schema arrives in Phase 1).
 * Fails fast with clear messages — never cryptic crashes.
 */
export type BootstrapEnv = {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
};

export function loadBootstrapEnv(): BootstrapEnv {
  const rawNodeEnv = process.env.NODE_ENV?.trim();

  let nodeEnv: BootstrapEnv['nodeEnv'] = 'development';
  if (!rawNodeEnv || rawNodeEnv.length === 0) {
    nodeEnv = 'development';
  } else if (
    rawNodeEnv === 'development' ||
    rawNodeEnv === 'production' ||
    rawNodeEnv === 'test'
  ) {
    nodeEnv = rawNodeEnv;
  } else {
    // Invalid NODE_ENV → safe default (Phase 0 edge case)

    console.warn(
      `[config] Invalid NODE_ENV="${rawNodeEnv}". Defaulting to "development".`,
    );
    nodeEnv = 'development';
  }

  const rawPort = process.env.PORT?.trim();
  const port = rawPort ? Number(rawPort) : 3000;

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `[config] Invalid PORT="${rawPort}". Must be an integer between 1 and 65535.`,
    );
  }

  return { nodeEnv, port };
}
