import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DispatchStatus,
  PaymentProvider,
  PaymentStatus,
  TripStatus,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

/**
 * Phase 16 — core happy path against Neon:
 * customer create → routes → select → admin assign → driver lifecycle →
 * cash collect → complete → commission ledger.
 */
describe('Phase 16 core happy path (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 12_000,
        durationSeconds: 900,
        polyline: 'p16_happy',
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('customer → admin → driver → cash → complete', async () => {
    const health = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect((health.body as Envelope<{ status: string }>).data.status).toMatch(
      /ok|degraded/,
    );

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@captaintruck.local', password: 'Admin@12345' })
      .expect(200);
    const adminToken = (adminLogin.body as Envelope<{ accessToken: string }>)
      .data.accessToken;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p16.happy.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P16 Happy Customer',
      })
      .expect(201);
    const customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p16.happy.drv.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P16 Happy Driver',
        vehiclePlate: 'LES-P16-H',
      })
      .expect(201);
    const driverId = (driver.body as Envelope<{ user: { id: string } }>).data
      .user.id;
    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p16.happy.drv.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    const driverToken = (dLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const truckTypeId = (await prisma.truckType.findFirst({
      where: { code: 'SMALL', isActive: true },
    }))!.id;

    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Happy Pickup',
        dropoffAddress: 'Happy Drop',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 31.55,
        dropoffLng: 74.38,
        paymentMethod: 'CASH',
      })
      .expect(201);
    const dispatchId = (created.body as Envelope<{ id: string }>).data.id;

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
      .send({ aiCostCents: 45_000 })
      .expect(201);
    const totalBillCents = (
      sel.body as Envelope<{ billBreakdown: { totalBillCents: number } }>
    ).data.billBreakdown.totalBillCents;
    expect(totalBillCents).toBeGreaterThan(0);
    expect((sel.body as Envelope<{ status: string }>).data.status).toBe(
      DispatchStatus.PENDING_ADMIN,
    );

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(201);
    const tripId = (
      approved.body as Envelope<{ trip: { id: string }; status: string }>
    ).data.trip.id;
    expect((approved.body as Envelope<{ status: string }>).data.status).toBe(
      DispatchStatus.APPROVED_ASSIGNED,
    );

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

    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 31.53, lng: 74.36, heading: 90, speedMps: 8 })
      .expect(201);

    const pay = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        requestId: dispatchId,
        provider: PaymentProvider.CASH,
        idempotencyKey: `p16-happy-${suffix}`,
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
        .data.status,
    ).toBe(TripStatus.COMPLETED);
    expect(
      (completed.body as Envelope<{ finalBillCents: number }>).data
        .finalBillCents,
    ).toBe(totalBillCents);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    expect(payment?.status).toBe(PaymentStatus.CASH_COLLECTED);

    const ledger = await prisma.commissionLedger.findUnique({
      where: { tripId },
    });
    expect(ledger).toBeTruthy();
    expect(ledger!.expectedCents).toBe(Math.floor((totalBillCents * 10) / 100));

    const dispatch = await prisma.dispatchRequest.findUnique({
      where: { id: dispatchId },
    });
    expect(dispatch?.status).toBe(DispatchStatus.COMPLETED);
  });
});
