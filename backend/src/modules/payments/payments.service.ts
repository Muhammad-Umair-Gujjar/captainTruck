import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DispatchStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { PaymentErrorCode } from '../../common/constants/error-codes';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { appHttpError } from '../../common/utils/http-error';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { isPaymentSettled } from './payment-status';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly stripe: StripeService,
  ) {}

  async create(actor: AuthUser, dto: CreatePaymentDto) {
    if (!dto.requestId && !dto.tripId) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.NO_BILL,
        'requestId or tripId is required',
      );
    }

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (
        existing.provider !== dto.provider ||
        (dto.requestId && existing.requestId !== dto.requestId) ||
        (dto.tripId && existing.tripId !== dto.tripId)
      ) {
        throw appHttpError(
          HttpStatus.CONFLICT,
          PaymentErrorCode.IDEMPOTENCY_CONFLICT,
          'Idempotency key reused with different payment parameters',
        );
      }
      return this.toPublic(existing);
    }

    const { request, tripId } = await this.resolveRequest(dto);
    this.assertCanPay(actor, request);

    const settled = await this.prisma.payment.findFirst({
      where: {
        requestId: request.id,
        status: { in: [PaymentStatus.PAID, PaymentStatus.CASH_COLLECTED] },
      },
    });
    if (settled) {
      throw appHttpError(
        HttpStatus.CONFLICT,
        PaymentErrorCode.ALREADY_PAID,
        'This dispatch already has a settled payment',
      );
    }

    const bill = this.computeBillForRequest(request);
    if (
      dto.clientAmountCents != null &&
      dto.clientAmountCents !== bill.totalBillCents
    ) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.AMOUNT_MISMATCH,
        'clientAmountCents must equal server totalBillCents',
        {
          clientAmountCents: dto.clientAmountCents,
          totalBillCents: bill.totalBillCents,
        },
      );
    }

    // Sync dispatch payment method if still unpaid
    const desiredMethod =
      dto.provider === PaymentProvider.STRIPE
        ? PaymentMethod.STRIPE
        : PaymentMethod.CASH;
    if (request.paymentMethod !== desiredMethod) {
      await this.prisma.dispatchRequest.update({
        where: { id: request.id },
        data: { paymentMethod: desiredMethod },
      });
    }

    if (dto.provider === PaymentProvider.CASH) {
      const payment = await this.prisma.payment.create({
        data: {
          requestId: request.id,
          tripId,
          provider: PaymentProvider.CASH,
          status: PaymentStatus.CASH_PENDING,
          amountCents: bill.totalBillCents,
          currency: 'PKR',
          idempotencyKey: dto.idempotencyKey,
        },
      });
      return this.toPublic(payment);
    }

    // Stripe Test Mode
    this.stripe.assertConfigured();
    const intent = await this.stripe.createPaymentIntent({
      amountCents: bill.totalBillCents,
      currency: 'pkr',
      idempotencyKey: dto.idempotencyKey,
      metadata: {
        requestId: request.id,
        tripId: tripId ?? '',
        idempotencyKey: dto.idempotencyKey,
      },
    });

    const status =
      intent.status === 'requires_action' ||
      intent.status === 'requires_confirmation' ||
      intent.status === 'requires_payment_method'
        ? PaymentStatus.REQUIRES_ACTION
        : intent.status === 'succeeded'
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING;

    const payment = await this.prisma.payment.create({
      data: {
        requestId: request.id,
        tripId,
        provider: PaymentProvider.STRIPE,
        status,
        amountCents: bill.totalBillCents,
        currency: 'PKR',
        idempotencyKey: dto.idempotencyKey,
        stripePaymentIntentId: intent.id,
      },
    });

    return {
      ...this.toPublic(payment),
      stripe: {
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        publishableKey: this.stripe.publishableKey ?? null,
        status: intent.status,
      },
    };
  }

  async getById(actor: AuthUser, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        request: { select: { customerId: true } },
        trip: { select: { driverId: true } },
      },
    });
    if (!payment) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        PaymentErrorCode.NOT_FOUND,
        'Payment not found',
      );
    }
    this.assertCanView(actor, payment);
    return this.toPublic(payment);
  }

  async listForRequest(actor: AuthUser, requestId: string) {
    const request = await this.prisma.dispatchRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        PaymentErrorCode.NOT_FOUND,
        'Dispatch not found',
      );
    }
    if (actor.role !== UserRole.ADMIN && request.customerId !== actor.id) {
      const trip = await this.prisma.trip.findUnique({
        where: { requestId },
      });
      if (!trip || trip.driverId !== actor.id) {
        throw appHttpError(
          HttpStatus.FORBIDDEN,
          PaymentErrorCode.FORBIDDEN,
          'Cannot list payments for this dispatch',
        );
      }
    }

    const items = await this.prisma.payment.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map((p) => this.toPublic(p)) };
  }

  /** Driver confirms cash collected at pickup. Idempotent. */
  async confirmCashCollected(actor: AuthUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        trip: true,
        request: true,
      },
    });
    if (!payment) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        PaymentErrorCode.NOT_FOUND,
        'Payment not found',
      );
    }

    if (payment.provider !== PaymentProvider.CASH) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.INVALID_STATUS,
        'Only cash payments can be marked collected',
      );
    }

    if (payment.status === PaymentStatus.CASH_COLLECTED) {
      return this.toPublic(payment);
    }

    if (payment.status !== PaymentStatus.CASH_PENDING) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.INVALID_STATUS,
        `Cannot collect cash in status ${payment.status}`,
      );
    }

    if (actor.role === UserRole.DRIVER) {
      const trip =
        payment.trip ??
        (payment.requestId
          ? await this.prisma.trip.findUnique({
              where: { requestId: payment.requestId },
            })
          : null);
      if (!trip || trip.driverId !== actor.id) {
        throw appHttpError(
          HttpStatus.FORBIDDEN,
          PaymentErrorCode.FORBIDDEN,
          'Only the assigned driver can confirm cash collection',
        );
      }
    } else if (actor.role !== UserRole.ADMIN) {
      throw appHttpError(
        HttpStatus.FORBIDDEN,
        PaymentErrorCode.FORBIDDEN,
        'Only driver or admin can confirm cash collection',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.CASH_COLLECTED },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'PAYMENT_CASH_COLLECTED',
          entityType: 'Payment',
          entityId: paymentId,
          metadata: { amountCents: payment.amountCents },
        },
      });
      return row;
    });

    return this.toPublic(updated);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!signature) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.WEBHOOK_INVALID,
        'Missing Stripe-Signature header',
      );
    }

    const event = this.stripe.constructEvent(rawBody, signature);
    this.logger.log(`Stripe webhook: ${event.type} ${event.id}`);

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const intent = event.data.object as {
        id: string;
        amount: number;
        metadata?: { requestId?: string; idempotencyKey?: string };
      };

      const payment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { stripePaymentIntentId: intent.id },
            intent.metadata?.idempotencyKey
              ? { idempotencyKey: intent.metadata.idempotencyKey }
              : undefined,
          ].filter(Boolean) as Array<{
            stripePaymentIntentId?: string;
            idempotencyKey?: string;
          }>,
        },
      });

      if (!payment) {
        // Out-of-order: intent before our DB row — acknowledge, retry later via Stripe
        this.logger.warn(
          `Webhook for unknown payment intent ${intent.id} — acknowledging`,
        );
        return { received: true, matched: false };
      }

      if (isPaymentSettled(payment.status)) {
        return { received: true, matched: true, idempotent: true };
      }

      if (payment.amountCents !== intent.amount) {
        this.logger.error(
          `Amount mismatch payment=${payment.id} db=${payment.amountCents} stripe=${intent.amount}`,
        );
        throw appHttpError(
          HttpStatus.BAD_REQUEST,
          PaymentErrorCode.AMOUNT_MISMATCH,
          'Stripe amount does not match server bill',
        );
      }

      let next: PaymentStatus = payment.status;
      if (event.type === 'payment_intent.succeeded') next = PaymentStatus.PAID;
      if (event.type === 'payment_intent.payment_failed')
        next = PaymentStatus.FAILED;
      if (event.type === 'payment_intent.canceled')
        next = PaymentStatus.CANCELLED;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: next,
          stripePaymentIntentId: intent.id,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: null,
          action: 'PAYMENT_STRIPE_WEBHOOK',
          entityType: 'Payment',
          entityId: payment.id,
          metadata: { eventType: event.type, eventId: event.id, status: next },
        },
      });

      return { received: true, matched: true, status: next };
    }

    return { received: true, matched: false };
  }

  private computeBillForRequest(request: {
    lockedBaseRateCents: number | null;
    truckCount: number;
    routeOptions: Array<{
      isSelected: boolean;
      aiCostCents: number;
    }>;
    status: DispatchStatus;
  }) {
    const selected = request.routeOptions.find((r) => r.isSelected);
    if (!selected) {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.NO_BILL,
        'Cannot create payment without a selected route',
      );
    }
    return this.pricing.computeBill({
      lockedBaseRateCents: request.lockedBaseRateCents,
      aiTripCostCents: selected.aiCostCents,
      truckCount: request.truckCount,
    });
  }

  private async resolveRequest(dto: CreatePaymentDto) {
    if (dto.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: dto.tripId },
        include: {
          request: { include: { routeOptions: true } },
        },
      });
      if (!trip) {
        throw appHttpError(
          HttpStatus.NOT_FOUND,
          PaymentErrorCode.NOT_FOUND,
          'Trip not found',
        );
      }
      return { request: trip.request, tripId: trip.id };
    }

    const request = await this.prisma.dispatchRequest.findUnique({
      where: { id: dto.requestId },
      include: { routeOptions: true, trip: true },
    });
    if (!request) {
      throw appHttpError(
        HttpStatus.NOT_FOUND,
        PaymentErrorCode.NOT_FOUND,
        'Dispatch not found',
      );
    }
    return { request, tripId: request.trip?.id ?? null };
  }

  private assertCanPay(actor: AuthUser, request: { customerId: string }) {
    if (actor.role === UserRole.ADMIN) return;
    if (actor.role === UserRole.CUSTOMER && request.customerId === actor.id)
      return;
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      PaymentErrorCode.FORBIDDEN,
      'Only the customer (or admin) can create a payment',
    );
  }

  private assertCanView(
    actor: AuthUser,
    payment: {
      request?: { customerId: string } | null;
      trip?: { driverId: string } | null;
    },
  ) {
    if (actor.role === UserRole.ADMIN) return;
    if (
      actor.role === UserRole.CUSTOMER &&
      payment.request?.customerId === actor.id
    ) {
      return;
    }
    if (actor.role === UserRole.DRIVER && payment.trip?.driverId === actor.id) {
      return;
    }
    throw appHttpError(
      HttpStatus.FORBIDDEN,
      PaymentErrorCode.FORBIDDEN,
      'Cannot view this payment',
    );
  }

  private toPublic(payment: {
    id: string;
    requestId: string | null;
    tripId: string | null;
    provider: PaymentProvider;
    status: PaymentStatus;
    amountCents: number;
    currency: string;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
    idempotencyKey: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: payment.id,
      requestId: payment.requestId,
      tripId: payment.tripId,
      provider: payment.provider,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      stripeSessionId: payment.stripeSessionId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      idempotencyKey: payment.idempotencyKey,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      note: 'Refunds are out of scope for FYP',
    };
  }
}
