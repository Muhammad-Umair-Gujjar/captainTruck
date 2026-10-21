import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpStatus } from '@nestjs/common';
import { PaymentErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { appHttpError } from '../src/common/utils/http-error';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { StripeService } from '../src/modules/payments/stripe.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 13 Payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverToken = '';
  let driverId = '';
  let truckTypeId = '';
  let dispatchId = '';
  let totalBillCents = 0;

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 10_000,
        durationSeconds: 700,
        polyline: 'p13_poly',
      },
    ]),
  };

  const mockStripe = {
    isConfigured: () => true,
    publishableKey: 'pk_test_mock',
    assertConfigured: () => undefined,
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test_mock',
      client_secret: 'pi_test_mock_secret',
      status: 'requires_payment_method',
    }),
    constructEvent: jest.fn(),
  };

  jest.setTimeout(120_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OsrmService)
      .useValue(mockOsrm)
      .overrideProvider(StripeService)
      .useValue(mockStripe)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
    prisma = app.get(PrismaService);

    const truck = await prisma.truckType.findFirst({
      where: { code: 'SMALL', isActive: true },
    });
    truckTypeId = truck!.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@captaintruck.local', password: 'Admin@12345' })
      .expect(200);
    adminToken = (adminLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p13.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P13 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p13.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P13 Driver',
        vehiclePlate: 'LES-P13',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;

    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p13.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (dLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'P13 A',
        dropoffAddress: 'P13 B',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
        paymentMethod: 'CASH',
      })
      .expect(201);
    dispatchId = (created.body as Envelope<{ id: string }>).data.id;

    const gen = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);
    const routeId = (
      gen.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0].id;

    const selected = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 40_000 })
      .expect(201);

    totalBillCents = (
      selected.body as Envelope<{
        billBreakdown: { totalBillCents: number };
      }>
    ).data.billBreakdown.totalBillCents;

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(201);
    tripId = (approved.body as Envelope<{ trip: { id: string } }>).data.trip.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cash flow: create, reject amount mismatch, collect idempotent', async () => {
    const bad = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p13-cash-bad-${suffix}`,
        clientAmountCents: totalBillCents + 1,
      })
      .expect(400);
    expect((bad.body as Envelope<unknown>).error?.code).toBe(
      PaymentErrorCode.AMOUNT_MISMATCH,
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p13-cash-${suffix}`,
        clientAmountCents: totalBillCents,
      })
      .expect(201);

    const pay = created.body as Envelope<{
      id: string;
      status: string;
      amountCents: number;
    }>;
    expect(pay.data.status).toBe(PaymentStatus.CASH_PENDING);
    expect(pay.data.amountCents).toBe(totalBillCents);

    // Idempotent recreate
    const again = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p13-cash-${suffix}`,
      })
      .expect(201);
    expect((again.body as Envelope<{ id: string }>).data.id).toBe(pay.data.id);

    const collected = await request(app.getHttpServer())
      .post(`/api/v1/payments/${pay.data.id}/cash/collect`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201);
    expect((collected.body as Envelope<{ status: string }>).data.status).toBe(
      PaymentStatus.CASH_COLLECTED,
    );

    const collected2 = await request(app.getHttpServer())
      .post(`/api/v1/payments/${pay.data.id}/cash/collect`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201);
    expect((collected2.body as Envelope<{ status: string }>).data.status).toBe(
      PaymentStatus.CASH_COLLECTED,
    );

    // Cannot create another payment after settled
    const blocked = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p13-cash-2-${suffix}`,
      })
      .expect(409);
    expect((blocked.body as Envelope<unknown>).error?.code).toBe(
      PaymentErrorCode.ALREADY_PAID,
    );
  });

  it('stripe create returns client secret; webhook verifies signature path', async () => {
    // New dispatch for stripe (previous is settled)
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'P13 S',
        dropoffAddress: 'P13 T',
        pickupLat: 31.51,
        pickupLng: 74.31,
        dropoffLat: 31.61,
        dropoffLng: 74.41,
      })
      .expect(201);
    const rid = (created.body as Envelope<{ id: string }>).data.id;
    const gen = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${rid}/routes/generate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);
    const routeId = (
      gen.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0].id;
    const sel = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${rid}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 20_000 })
      .expect(201);
    const bill = (
      sel.body as Envelope<{ billBreakdown: { totalBillCents: number } }>
    ).data.billBreakdown.totalBillCents;

    // Need another free driver for approve? First driver may still be busy on trip1
    const driver2 = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p13.driver2.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P13 Driver2',
        vehiclePlate: 'LES-P13B',
      })
      .expect(201);
    const driver2Id = (driver2.body as Envelope<{ user: { id: string } }>).data
      .user.id;
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${rid}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: driver2Id })
      .expect(201);

    const pay = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: rid,
        provider: PaymentProvider.STRIPE,
        idempotencyKey: `p13-stripe-${suffix}`,
        clientAmountCents: bill,
      })
      .expect(201);

    const body = pay.body as Envelope<{
      id: string;
      amountCents: number;
      stripe: { clientSecret: string; paymentIntentId: string };
    }>;
    expect(body.data.amountCents).toBe(bill);
    expect(body.data.stripe.clientSecret).toContain('pi_test');
    expect(mockStripe.createPaymentIntent).toHaveBeenCalled();

    mockStripe.constructEvent.mockImplementation(() => {
      throw appHttpError(
        HttpStatus.BAD_REQUEST,
        PaymentErrorCode.WEBHOOK_INVALID,
        'Invalid signature',
      );
    });

    const badHook = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/stripe')
      .set('stripe-signature', 'bad')
      .send({ type: 'payment_intent.succeeded' })
      .expect(400);
    expect((badHook.body as Envelope<unknown>).error?.code).toBe(
      PaymentErrorCode.WEBHOOK_INVALID,
    );

    mockStripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_mock',
          amount: bill,
          metadata: { idempotencyKey: `p13-stripe-${suffix}` },
        },
      },
    });

    const okHook = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/stripe')
      .set('stripe-signature', 'good')
      .send({ type: 'payment_intent.succeeded' })
      .expect(201);

    expect(
      (okHook.body as Envelope<{ received: boolean; status: string }>).data
        .received,
    ).toBe(true);

    const updated = await prisma.payment.findUnique({
      where: { id: body.data.id },
    });
    expect(updated?.status).toBe(PaymentStatus.PAID);

    // Decline path
    mockStripe.createPaymentIntent.mockResolvedValueOnce({
      id: 'pi_test_decline',
      client_secret: 'pi_test_decline_secret',
      status: 'requires_payment_method',
    });
  });
});
