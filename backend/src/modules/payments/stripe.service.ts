import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentErrorCode } from '../../common/constants/error-codes';
import { appHttpError } from '../../common/utils/http-error';
import { APP_CONFIG } from '../../config/config.constants';
import type { AppConfig } from '../../config/env.schema';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client: Stripe | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const key = config.stripe.secretKey;
    if (key) {
      this.client = new Stripe(key);
      if (!key.startsWith('sk_test_')) {
        this.logger.warn(
          'STRIPE_SECRET_KEY is not sk_test_ — FYP requires Test Mode only',
        );
      }
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.config.stripe.secretKey);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        PaymentErrorCode.STRIPE_NOT_CONFIGURED,
        'Stripe Test Mode is not configured (set STRIPE_SECRET_KEY)',
      );
    }
  }

  get publishableKey(): string | undefined {
    return this.config.stripe.publishableKey;
  }

  async createPaymentIntent(input: {
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    this.assertConfigured();
    return this.client!.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: input.metadata,
      },
      { idempotencyKey: input.idempotencyKey },
    );
  }

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    this.assertConfigured();
    const secret = this.config.stripe.webhookSecret;
    if (!secret) {
      throw appHttpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        PaymentErrorCode.STRIPE_NOT_CONFIGURED,
        'STRIPE_WEBHOOK_SECRET is not set',
      );
    }
    try {
      return this.client!.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid signature';
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.WEBHOOK_INVALID,
        message,
      );
    }
  }
}
