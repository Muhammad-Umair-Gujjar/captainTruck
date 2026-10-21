import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripe: StripeService,
  ) {}

  @Get('stripe/status')
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER, UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Whether Stripe Test Mode is configured' })
  stripeStatus() {
    return {
      configured: this.stripe.isConfigured(),
      publishableKey: this.stripe.isConfigured()
        ? (this.stripe.publishableKey ?? null)
        : null,
      mode: 'test',
      refunds: 'out_of_scope',
    };
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Create payment (cash or Stripe test). Amount = server bill. Idempotent key required.',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user, dto);
  }

  @Get('by-request/:requestId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments for a dispatch' })
  listByRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
  ) {
    return this.paymentsService.listForRequest(user, requestId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by id' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.getById(user, id);
  }

  @Post(':id/cash/collect')
  @ApiBearerAuth()
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Driver confirms cash collected (idempotent)',
  })
  collectCash(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentsService.confirmCashCollected(user, id);
  }

  @Public()
  @Post('webhook/stripe')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Stripe webhook (signature required; raw body)' })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const raw =
      req.rawBody ??
      Buffer.from(
        typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {}),
      );
    return this.paymentsService.handleStripeWebhook(raw, signature);
  }
}
