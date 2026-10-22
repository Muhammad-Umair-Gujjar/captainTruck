import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatThreadType, MessageType, TripStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  AuthErrorCode,
  ChatErrorCode,
  DispatchErrorCode,
  PaymentErrorCode,
  TripErrorCode,
} from '../src/common/constants/error-codes';
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
 * Phase 16 — IDOR sweep: Customer B / unassigned driver must not read or mutate
 * Customer A's dispatch, trip, payment, or chat resources.
 */
describe('Phase 16 IDOR sweep (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let adminToken = '';
  let customerAToken = '';
  let customerBToken = '';
  let driverToken = '';
  let otherDriverToken = '';
  let driverId = '';
  let truckTypeId = '';
  let dispatchId = '';
  let tripId = '';
  let paymentId = '';
  let threadId = '';
  let totalBillCents = 0;

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 9_000,
        durationSeconds: 700,
        polyline: 'p16_idor',
      },
    ]),
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

    truckTypeId = (await prisma.truckType.findFirst({
      where: { code: 'SMALL', isActive: true },
    }))!.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@captaintruck.local', password: 'Admin@12345' })
      .expect(200);
    adminToken = (adminLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    for (const [label, setter] of [
      [
        'A',
        (t: string) => {
          customerAToken = t;
        },
      ],
      [
        'B',
        (t: string) => {
          customerBToken = t;
        },
      ],
    ] as const) {
      const reg = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `p16.idor.${label}.${suffix}@example.com`,
          password: 'Customer1!',
          fullName: `P16 IDOR ${label}`,
        })
        .expect(201);
      setter((reg.body as Envelope<{ accessToken: string }>).data.accessToken);
    }

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p16.idor.drv.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P16 IDOR Driver',
        vehiclePlate: 'LES-P16-I',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;
    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p16.idor.drv.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (dLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p16.idor.other.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P16 Other Driver',
        vehiclePlate: 'LES-P16-O',
      })
      .expect(201);
    const oLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p16.idor.other.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    otherDriverToken = (oLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'IDOR Pickup',
        dropoffAddress: 'IDOR Drop',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
      })
      .expect(201);
    dispatchId = (created.body as Envelope<{ id: string }>).data.id;

    const gen = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(201);
    const routeId = (
      gen.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0].id;
    const sel = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ aiCostCents: 40_000 })
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

    const pay = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        requestId: dispatchId,
        provider: 'CASH',
        idempotencyKey: `p16-idor-${suffix}`,
        clientAmountCents: totalBillCents,
      })
      .expect(201);
    paymentId = (pay.body as Envelope<{ id: string }>).data.id;

    const thread = await request(app.getHttpServer())
      .post(`/api/v1/chat/trips/${tripId}/threads`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ type: ChatThreadType.DRIVER_CUSTOMER })
      .expect(201);
    threadId = (thread.body as Envelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects mass-assignment of role on profile update', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ fullName: 'Hacker', role: 'ADMIN', passwordHash: 'x' })
      .expect(400);
    expect((res.body as Envelope<unknown>).success).toBe(false);
  });

  it('blocks Customer B from Customer A dispatch', async () => {
    const get = await request(app.getHttpServer())
      .get(`/api/v1/dispatches/${dispatchId}`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((get.body as Envelope<unknown>).error?.code).toBe(
      DispatchErrorCode.FORBIDDEN,
    );

    const cancel = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/cancel`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((cancel.body as Envelope<unknown>).error?.code).toBe(
      DispatchErrorCode.FORBIDDEN,
    );
  });

  it('blocks other customer/driver from trip and GPS', async () => {
    const get = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((get.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.FORBIDDEN,
    );

    const otherGet = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .expect(403);
    expect((otherGet.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.FORBIDDEN,
    );

    const status = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({ status: TripStatus.EN_ROUTE_PICKUP })
      .expect(403);
    expect((status.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.FORBIDDEN,
    );

    const loc = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/location`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .send({ lat: 31.5, lng: 74.3 })
      .expect(403);
    expect((loc.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.FORBIDDEN,
    );
  });

  it('blocks Customer B from Customer A payment', async () => {
    const get = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((get.body as Envelope<unknown>).error?.code).toBe(
      PaymentErrorCode.FORBIDDEN,
    );

    const collect = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/cash/collect`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((collect.body as Envelope<unknown>).error?.code).toBeTruthy();
  });

  it('blocks stranger from chat thread', async () => {
    const msgs = await request(app.getHttpServer())
      .get(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);
    expect((msgs.body as Envelope<unknown>).error?.code).toBe(
      ChatErrorCode.FORBIDDEN,
    );

    const send = await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ type: MessageType.TEXT, body: 'intrusion' })
      .expect(403);
    expect((send.body as Envelope<unknown>).error?.code).toBe(
      ChatErrorCode.FORBIDDEN,
    );
  });

  it('blocks non-admin from reading another user by id', async () => {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@captaintruck.local' },
    });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/users/${adminUser!.id}`)
      .set('Authorization', `Bearer ${customerAToken}`)
      .expect(403);
    expect((res.body as Envelope<unknown>).error?.code).toBe(
      AuthErrorCode.FORBIDDEN_ROLE,
    );
  });
});
