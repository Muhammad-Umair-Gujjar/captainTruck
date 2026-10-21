import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === undefined || value === null ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_URL: z.string().url().default('http://localhost:3000'),

    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:3000'),

    DATABASE_URL: optionalUrl,
    DATABASE_URL_DIRECT: optionalUrl,

    JWT_ACCESS_SECRET: optionalString,
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: optionalString,
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    REDIS_URL: optionalUrl,

    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_PUBLISHABLE_KEY: optionalString,

    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,

    FCM_PROJECT_ID: optionalString,
    FCM_CLIENT_EMAIL: optionalString,
    FCM_PRIVATE_KEY: optionalString,

    OSRM_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
    NOMINATIM_BASE_URL: z
      .string()
      .url()
      .default('https://nominatim.openstreetmap.org'),
    PHOTON_BASE_URL: z.string().url().default('https://photon.komoot.io'),

    COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(10),
    CHAT_TTL_DAYS: z.coerce.number().int().min(1).default(90),

    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  })
  .superRefine((env, ctx) => {
    const origins = env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'At least one CORS origin is required',
      });
    }

    if (env.NODE_ENV === 'production') {
      if (origins.includes('*')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGINS'],
          message: 'Wildcard CORS (*) is forbidden in production',
        });
      }

      if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'JWT_ACCESS_SECRET is required in production (min 32 characters)',
        });
      }

      if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET is required in production (min 32 characters)',
        });
      }
    }
  });

export type RawEnv = z.infer<typeof envSchema>;

export type AppConfig = {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  apiUrl: string;
  corsOrigins: string[];
  databaseUrl?: string;
  databaseUrlDirect?: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  redisUrl?: string;
  stripe: {
    secretKey?: string;
    webhookSecret?: string;
    publishableKey?: string;
  };
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  fcm: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  };
  osm: {
    osrmBaseUrl: string;
    nominatimBaseUrl: string;
    photonBaseUrl: string;
  };
  commissionPercent: number;
  chatTtlDays: number;
  throttle: {
    ttlMs: number;
    limit: number;
  };
};

export function toAppConfig(env: RawEnv): AppConfig {
  const corsOrigins = env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const devFallbackSecret = 'dev-only-insecure-secret-change-me-32chars';

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiUrl: env.API_URL,
    corsOrigins,
    databaseUrl: env.DATABASE_URL,
    databaseUrlDirect: env.DATABASE_URL_DIRECT,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET ?? devFallbackSecret,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET ?? `${devFallbackSecret}-refresh`,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    redisUrl: env.REDIS_URL,
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    },
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    },
    fcm: {
      projectId: env.FCM_PROJECT_ID,
      clientEmail: env.FCM_CLIENT_EMAIL,
      privateKey: env.FCM_PRIVATE_KEY,
    },
    osm: {
      osrmBaseUrl: env.OSRM_BASE_URL,
      nominatimBaseUrl: env.NOMINATIM_BASE_URL,
      photonBaseUrl: env.PHOTON_BASE_URL,
    },
    commissionPercent: env.COMMISSION_PERCENT,
    chatTtlDays: env.CHAT_TTL_DAYS,
    throttle: {
      ttlMs: env.THROTTLE_TTL_MS,
      limit: env.THROTTLE_LIMIT,
    },
  };
}
