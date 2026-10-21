import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Neon free tier may cold-start; retry with exponential backoff.
   */
  private async connectWithRetry(
    maxAttempts = 5,
    baseDelayMs = 500,
  ): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        this.logger.log('Connected to PostgreSQL (Neon)');
        return;
      } catch (error: unknown) {
        lastError = error;
        const delay = baseDelayMs * 2 ** (attempt - 1);
        this.logger.warn(
          `DB connect attempt ${attempt}/${maxAttempts} failed; retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed to connect to database after retries: ${message}`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
