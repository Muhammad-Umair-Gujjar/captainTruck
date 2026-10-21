import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const LOCK_KEY = 'chat:retention:lock';
const LOCK_TTL_SECONDS = 300;
const BATCH_SIZE = 200;

export type RetentionRunResult = {
  ran: boolean;
  skippedLocked: boolean;
  ttlDays: number;
  cutoffIso: string;
  deletedMessages: number;
  mediaDeleteAttempts: number;
  mediaDeleted: number;
  mediaDeleteFailed: number;
  batches: number;
  jobId: string | null;
};

@Injectable()
export class ChatRetentionService {
  private readonly logger = new Logger(ChatRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly media: MediaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Daily at 03:00 server time. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledRun() {
    const result = await this.runCleanup();
    this.logger.log(
      `Scheduled retention: ran=${result.ran} deleted=${result.deletedMessages} locked=${result.skippedLocked}`,
    );
  }

  /**
   * Delete messages older than CHAT_TTL_DAYS.
   * Uses Redis NX lock so overlapping instances skip.
   * Idempotent: re-running after success deletes nothing.
   */
  async runCleanup(options?: {
    forceUnlock?: boolean;
  }): Promise<RetentionRunResult> {
    const ttlDays = this.config.chatTtlDays;
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
    const jobId = randomUUID();

    if (options?.forceUnlock) {
      await this.redis.del(LOCK_KEY);
    }

    const acquired = await this.redis.setNxEx(
      LOCK_KEY,
      jobId,
      LOCK_TTL_SECONDS,
    );
    if (!acquired) {
      this.logger.warn('Chat retention skipped — lock held by another run');
      return {
        ran: false,
        skippedLocked: true,
        ttlDays,
        cutoffIso: cutoff.toISOString(),
        deletedMessages: 0,
        mediaDeleteAttempts: 0,
        mediaDeleted: 0,
        mediaDeleteFailed: 0,
        batches: 0,
        jobId: null,
      };
    }

    let deletedMessages = 0;
    let mediaDeleteAttempts = 0;
    let mediaDeleted = 0;
    let mediaDeleteFailed = 0;
    let batches = 0;

    try {
      // Loop batches until none left (safe under partial failure — next run continues)
      for (;;) {
        const stale = await this.prisma.message.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true, mediaUrl: true },
          take: BATCH_SIZE,
          orderBy: { createdAt: 'asc' },
        });

        if (stale.length === 0) break;
        batches += 1;

        for (const msg of stale) {
          if (msg.mediaUrl) {
            mediaDeleteAttempts += 1;
            const ok = await this.media.tryDeleteByUrl(msg.mediaUrl);
            if (ok) mediaDeleted += 1;
            else mediaDeleteFailed += 1;
          }
        }

        const ids = stale.map((m) => m.id);
        const deleted = await this.prisma.message.deleteMany({
          where: { id: { in: ids } },
        });
        deletedMessages += deleted.count;

        // Avoid tight loop if somehow delete failed to clear
        if (deleted.count === 0) break;
      }

      this.logger.log(
        JSON.stringify({
          event: 'chat_retention_complete',
          jobId,
          ttlDays,
          cutoff: cutoff.toISOString(),
          deletedMessages,
          mediaDeleteAttempts,
          mediaDeleted,
          mediaDeleteFailed,
          batches,
        }),
      );
    } finally {
      // Only release if we still own the lock value
      const current = await this.redis.get(LOCK_KEY);
      if (current === jobId) {
        await this.redis.del(LOCK_KEY);
      }
    }

    return {
      ran: true,
      skippedLocked: false,
      ttlDays,
      cutoffIso: cutoff.toISOString(),
      deletedMessages,
      mediaDeleteAttempts,
      mediaDeleted,
      mediaDeleteFailed,
      batches,
      jobId,
    };
  }
}
