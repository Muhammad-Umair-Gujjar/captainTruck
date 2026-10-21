import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

/**
 * Redis with in-memory fallback when REDIS_URL is unset (local/test).
 * Prefer Upstash (`rediss://…`) or Oracle Redis in deployed environments.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memory = new Map<string, { value: string; expiresAt?: number }>();
  private usingMemory = true;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit() {
    if (!this.config.redisUrl) {
      this.logger.warn(
        'REDIS_URL not set — using in-memory store (not shared across instances)',
      );
      this.usingMemory = true;
      return;
    }

    try {
      this.client = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      await this.client.connect();
      this.usingMemory = false;
      this.logger.log('Redis connected');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Redis unavailable (${message}) — falling back to in-memory (fail-open)`,
      );
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
      this.usingMemory = true;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
    this.memory.clear();
  }

  isMemoryFallback(): boolean {
    return this.usingMemory;
  }

  async get(key: string): Promise<string | null> {
    if (this.client && !this.usingMemory) {
      return this.client.get(key);
    }
    this.purgeExpired(key);
    return this.memory.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client && !this.usingMemory) {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds
        ? Date.now() + ttlSeconds * 1000
        : undefined,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client && !this.usingMemory) {
      await this.client.del(key);
      return;
    }
    this.memory.delete(key);
  }

  /** SET key NX EX ttl — returns true if set. Used for throttle locks. */
  async setNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.client && !this.usingMemory) {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    }
    this.purgeExpired(key);
    if (this.memory.has(key)) return false;
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  private purgeExpired(key: string) {
    const entry = this.memory.get(key);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
    }
  }
}
