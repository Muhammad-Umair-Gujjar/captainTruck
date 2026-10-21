import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { AppConfig, envSchema, toAppConfig } from './env.schema';

/**
 * Loads `.env` then validates with Zod.
 * Fails fast with a clear message (never cryptic crashes).
 */
export function loadEnv(envPath?: string): AppConfig {
  loadDotenv({
    path: envPath ?? resolve(process.cwd(), '.env'),
    override: false,
    quiet: true,
  });

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[config] Invalid environment configuration:\n${details}\n` +
        `Copy backend/.env.example to backend/.env and fill required values.`,
    );
  }

  return toAppConfig(parsed.data);
}
