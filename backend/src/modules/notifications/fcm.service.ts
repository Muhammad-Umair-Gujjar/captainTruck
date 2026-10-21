import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type SendResponse } from 'firebase-admin/messaging';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

export type PushPayload = {
  title: string;
  body: string;
  /** Flat string map for FCM data messages (no nested objects). */
  data?: Record<string, string>;
};

export type SendResult = {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
};

/** FCM error codes that mean the token should be removed from our DB. */
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private ready = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  onModuleInit(): void {
    if (!this.isConfigured()) {
      this.logger.warn(
        'FCM credentials not set — push sends are no-ops until FCM_* is configured',
      );
      return;
    }

    try {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: this.config.fcm.projectId!,
            clientEmail: this.config.fcm.clientEmail!,
            privateKey: this.normalizePrivateKey(this.config.fcm.privateKey!),
          }),
        });
      }
      this.ready = true;
      this.logger.log('Firebase Admin initialized for FCM');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`FCM init failed: ${message}`);
      this.ready = false;
    }
  }

  isConfigured(): boolean {
    const { projectId, clientEmail, privateKey } = this.config.fcm;
    return Boolean(projectId && clientEmail && privateKey);
  }

  /**
   * Send the same notification to many device tokens.
   * Partial failures are logged; invalid tokens are returned for pruning.
   */
  async sendToTokens(
    tokens: string[],
    payload: PushPayload,
  ): Promise<SendResult> {
    const unique = [...new Set(tokens.filter(Boolean))];
    if (unique.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    if (!this.ready) {
      this.logger.debug(
        `FCM skip (not ready): ${unique.length} token(s) title="${payload.title}"`,
      );
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: unique,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: { priority: 'high' },
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((res: SendResponse, i: number) => {
        if (res.success) return;
        const code = res.error?.code ?? '';
        this.logger.warn(
          `FCM token failure [${code}]: ${res.error?.message ?? 'unknown'}`,
        );
        if (INVALID_TOKEN_CODES.has(code)) {
          const token = unique[i];
          if (token) invalidTokens.push(token);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`FCM multicast failed: ${message}`);
      return {
        successCount: 0,
        failureCount: unique.length,
        invalidTokens: [],
      };
    }
  }

  /** Env vars often store PEM with literal `\n` escapes. */
  normalizePrivateKey(raw: string): string {
    return raw.replace(/\\n/g, '\n').trim();
  }
}
