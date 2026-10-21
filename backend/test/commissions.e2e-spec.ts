import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProvider, PaymentStatus, TripStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TripErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 14 Commissions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverToken = '';
  let driverId = '';
  let truckTypeId = '';
  let dispatchId = '';
  let tripId = '';
  let totalBillCents = 0;

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 9_000,
        durationSeconds: 650,
        polyline: 'p14_poly',
      },
    ]),
  };

  jest.setTimeout(120_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';
    process.env.COMMISSION_PERCENT = '10';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OsrmService)
      .useValue(mockOsrm)
      .compile();

    app = moduleFixture.createNestApplication();
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
        email: `p14.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P14 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p14.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P14 Driver',
        vehiclePlate: 'LES-P14',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;

    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p14.driver.${suffix}@example.com`,
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
        pickupAddress: 'P14 A',
        dropoffAddress: 'P14 B',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
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
    const sel = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 50_000 })
      .expect(201);
    totalBillCents = (
      sel.body as Envelope<{ billBreakdown: { totalBillCents: number } }>
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

  async function advanceToDelivered() {
    for (const status of [
      TripStatus.EN_ROUTE_PICKUP,
      TripStatus.ARRIVED_PICKUP,
      TripStatus.IN_TRANSIT,
      TripStatus.DELIVERED,
    ]) {
      await request(app.getHttpServer())
        .post(`/api/v1/trips/${tripId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status })
        .expect(201);
    }
  }

  it('blocks complete without payment; creates ledger; admin confirms; driver cannot', async () => {
    await advanceToDelivered();

    const blocked = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: TripStatus.COMPLETED })
      .expect(400);
    expect((blocked.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.PAYMENT_REQUIRED,
    );

    const pay = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p14-cash-${suffix}`,
        clientAmountCents: totalBillCents,
      })
      .expect(201);
    const paymentId = (pay.body as Envelope<{ id: string }>).data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/cash/collect`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201);

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: TripStatus.COMPLETED })
      .expect(201);
    expect(
      (completed.body as Envelope<{ status: string; finalBillCents: number }>)
        .data.finalBillCents,
    ).toBe(totalBillCents);

    const ledger = await prisma.commissionLedger.findUnique({
      where: { tripId },
    });
    expect(ledger).toBeTruthy();
    expect(ledger!.commissionPercent).toBe(10);
    expect(ledger!.expectedCents).toBe(Math.floor((totalBillCents * 10) / 100));
    expect(ledger!.pendingCents).toBe(ledger!.expectedCents);
    expect(ledger!.adminConfirmedAt).toBeNull();

    // Idempotent double-complete
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: TripStatus.COMPLETED })
      .expect(201);
    const count = await prisma.commissionLedger.count({ where: { tripId } });
    expect(count).toBe(1);

    const mine = await request(app.getHttpServer())
      .get('/api/v1/commissions/mine')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    expect(
      (
        mine.body as Envelope<{ items: Array<{ tripId: string }> }>
      ).data.items.some((i) => i.tripId === tripId),
    ).toBe(true);

    // Driver cannot confirm (RolesGuard → AUTH_010)
    const selfConfirm = await request(app.getHttpServer())
      .post(`/api/v1/commissions/${ledger!.id}/confirm`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
    expect((selfConfirm.body as Envelope<unknown>).error?.code).toBeTruthy();

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/commissions/${ledger!.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    const confBody = confirmed.body as Envelope<{
      pendingCents: number;
      collectedCents: number;
      confirmed: boolean;
    }>;
    expect(confBody.data.confirmed).toBe(true);
    expect(confBody.data.pendingCents).toBe(0);
    expect(confBody.data.collectedCents).toBe(ledger!.expectedCents);

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: ledger!.id, action: 'COMMISSION_CONFIRM' },
    });
    expect(audit).toBeTruthy();

    const summary = await request(app.getHttpServer())
      .get('/api/v1/commissions/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const items = (
      summary.body as Envelope<{
        items: Array<{ driverId: string; expectedCents: number }>;
      }>
    ).data.items;
    expect(items.some((i) => i.driverId === driverId)).toBe(true);

    // Payment settled check
    const settled = await prisma.payment.findFirst({
      where: { requestId: dispatchId, status: PaymentStatus.CASH_COLLECTED },
    });
    expect(settled).toBeTruthy();
  });
});
