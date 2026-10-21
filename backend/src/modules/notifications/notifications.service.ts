import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { NotificationErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService, type PushPayload } from './fcm.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  isConfigured(): boolean {
    return this.fcm.isConfigured();
  }

  async registerToken(actor: AuthUser, token: string) {
    const cleaned = token.trim();
    if (cleaned.length < 20) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        NotificationErrorCode.TOKEN_INVALID,
        'Invalid FCM device token',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { fcmTokens: true },
    });
    if (!user) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        NotificationErrorCode.FORBIDDEN,
        'User not found',
      );
    }

    const next = user.fcmTokens.includes(cleaned)
      ? user.fcmTokens
      : [...user.fcmTokens, cleaned];

    if (next !== user.fcmTokens) {
      await this.prisma.user.update({
        where: { id: actor.id },
        data: { fcmTokens: next },
      });
    }

    return { registered: true, tokenCount: next.length };
  }

  async unregisterToken(actor: AuthUser, token: string) {
    const cleaned = token.trim();
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { fcmTokens: true },
    });
    if (!user) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        NotificationErrorCode.FORBIDDEN,
        'User not found',
      );
    }

    const next = user.fcmTokens.filter((t) => t !== cleaned);
    if (next.length !== user.fcmTokens.length) {
      await this.prisma.user.update({
        where: { id: actor.id },
        data: { fcmTokens: next },
      });
    }

    return { registered: false, tokenCount: next.length };
  }

  async listMyTokens(actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { fcmTokens: true },
    });
    return {
      tokens: user?.fcmTokens ?? [],
      tokenCount: user?.fcmTokens.length ?? 0,
    };
  }

  /**
   * Fire-and-forget safe wrapper — never throws to callers.
   * 0 tokens / FCM not configured → success no-op.
   */
  notifyUserSafe(userId: string, payload: PushPayload): void {
    void this.notifyUser(userId, payload).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`notifyUserSafe(${userId}): ${message}`);
    });
  }

  notifyUsersSafe(userIds: string[], payload: PushPayload): void {
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const id of unique) {
      this.notifyUserSafe(id, payload);
    }
  }

  async notifyUser(
    userId: string,
    payload: PushPayload,
  ): Promise<{
    sent: boolean;
    tokenCount: number;
    pruned: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });
    const tokens = user?.fcmTokens ?? [];
    if (tokens.length === 0) {
      return { sent: false, tokenCount: 0, pruned: 0 };
    }

    const result = await this.fcm.sendToTokens(tokens, payload);
    let pruned = 0;
    if (result.invalidTokens.length > 0) {
      pruned = await this.pruneTokens(userId, result.invalidTokens);
    }

    return {
      sent: result.successCount > 0,
      tokenCount: tokens.length,
      pruned,
    };
  }

  /** Remove bad tokens from the user's array (idempotent). */
  async pruneTokens(userId: string, invalidTokens: string[]): Promise<number> {
    if (invalidTokens.length === 0) return 0;
    const bad = new Set(invalidTokens);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });
    if (!user) return 0;

    const next = user.fcmTokens.filter((t) => !bad.has(t));
    const removed = user.fcmTokens.length - next.length;
    if (removed > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcmTokens: next },
      });
      this.logger.log(`Pruned ${removed} invalid FCM token(s) for ${userId}`);
    }
    return removed;
  }

  // --- Domain event helpers (no sensitive payment amounts) ---

  notifyDispatchAssigned(input: {
    customerId: string;
    driverId: string;
    dispatchId: string;
    tripId?: string;
  }): void {
    const data = {
      type: 'dispatch.assigned',
      dispatchId: input.dispatchId,
      ...(input.tripId ? { tripId: input.tripId } : {}),
    };
    this.notifyUserSafe(input.customerId, {
      title: 'Driver assigned',
      body: 'Your dispatch was approved and a driver was assigned.',
      data,
    });
    this.notifyUserSafe(input.driverId, {
      title: 'New assignment',
      body: 'You have been assigned a new trip.',
      data,
    });
  }

  notifyDispatchRejected(input: {
    customerId: string;
    driverId?: string | null;
    dispatchId: string;
  }): void {
    const data = {
      type: 'dispatch.rejected',
      dispatchId: input.dispatchId,
    };
    this.notifyUserSafe(input.customerId, {
      title: 'Dispatch declined',
      body: 'Your dispatch request was declined. Open the app for details.',
      data,
    });
    if (input.driverId) {
      this.notifyUserSafe(input.driverId, {
        title: 'Assignment cancelled',
        body: 'A trip assignment was cancelled by admin.',
        data,
      });
    }
  }

  notifyTripStatus(input: {
    customerId: string;
    driverId: string;
    tripId: string;
    status: string;
    excludeUserId?: string;
  }): void {
    const data = {
      type: 'trip.status',
      tripId: input.tripId,
      status: input.status,
    };
    const payload: PushPayload = {
      title: 'Trip update',
      body: `Trip status is now ${input.status.replace(/_/g, ' ').toLowerCase()}.`,
      data,
    };
    const targets = [input.customerId, input.driverId].filter(
      (id) => id && id !== input.excludeUserId,
    );
    this.notifyUsersSafe(targets, payload);
  }

  notifyChatMessage(input: {
    recipientIds: string[];
    threadId: string;
    senderName: string;
    preview: string;
  }): void {
    const preview =
      input.preview.length > 80
        ? `${input.preview.slice(0, 77)}...`
        : input.preview;
    this.notifyUsersSafe(input.recipientIds, {
      title: input.senderName || 'New message',
      body: preview || 'New chat message',
      data: {
        type: 'chat.message',
        threadId: input.threadId,
      },
    });
  }

  notifyPaymentResult(input: {
    customerId: string;
    driverId?: string | null;
    paymentId: string;
    outcome: 'paid' | 'cash_collected' | 'failed' | 'cancelled';
  }): void {
    const labels: Record<
      typeof input.outcome,
      { title: string; body: string }
    > = {
      paid: {
        title: 'Payment successful',
        body: 'Your card payment was confirmed.',
      },
      cash_collected: {
        title: 'Cash collected',
        body: 'Cash-on-pickup was confirmed for your trip.',
      },
      failed: {
        title: 'Payment failed',
        body: 'Your payment could not be completed. Try again in the app.',
      },
      cancelled: {
        title: 'Payment cancelled',
        body: 'Your payment was cancelled.',
      },
    };
    const copy = labels[input.outcome];
    const data = {
      type: 'payment.result',
      paymentId: input.paymentId,
      outcome: input.outcome,
    };
    this.notifyUserSafe(input.customerId, { ...copy, data });
    if (input.driverId && input.outcome === 'cash_collected') {
      this.notifyUserSafe(input.driverId, {
        title: 'Cash confirmed',
        body: 'Cash collection was recorded for your trip.',
        data,
      });
    }
  }
}
