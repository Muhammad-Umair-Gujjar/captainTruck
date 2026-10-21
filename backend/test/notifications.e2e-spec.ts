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
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { FcmService } from '../src/modules/notifications/fcm.service';
import type { PushPayload, SendResult } from '../src/modules/notifications/fcm.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 15 FCM notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let customerId = '';
  let driverToken = '';
  let driverId = '';
  let truckTypeId = '';

  const sent: Array<{ tokens: string[]; payload: PushPayload }> = [];
  let pruneMode = false;
  let sendSpy: jest.SpyInstance;

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 8_500,
        durationSeconds: 600,
        polyline: 'p15_poly',
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
    notifications = app.get(NotificationsService);

    const fcm = app.get(FcmService);
    sendSpy = jest
      .spyOn(fcm, 'sendToTokens')
      .mockImplementation(
        async (tokens: string[], payload: PushPayload): Promise<SendResult> => {
          sent.push({ tokens: [...tokens], payload });
          if (pruneMode) {
            return {
              successCount: 0,
              failureCount: tokens.length,
              invalidTokens: [...tokens],
            };
          }
          return {
            successCount: tokens.length,
            failureCount: 0,
            invalidTokens: [],
          };
        },
      );
    jest.spyOn(fcm, 'isConfigured').mockReturnValue(true);

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
        email: `p15.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P15 Customer',
      })
      .expect(201);
    const regData = (
      reg.body as Envelope<{ accessToken: string; user: { id: string } }>
    ).data;
    customerToken = regData.accessToken;
    customerId = regData.user.id;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p15.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P15 Driver',
        vehiclePlate: 'LES-P15-1',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;

    const driverLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p15.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (driverLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;
  });

  afterAll(async () => {
    sendSpy?.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    sent.length = 0;
    pruneMode = false;
  });

  async function waitForSends(min = 1, ms = 1500): Promise<void> {
    const start = Date.now();
    while (sent.length < min && Date.now() - start < ms) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function createRoutedDispatch(): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Lahore Cantt',
        dropoffAddress: 'Gulberg',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 31.51,
        dropoffLng: 74.34,
        paymentMethod: 'CASH',
      })
      .expect(201);
    const dispatchId = (created.body as Envelope<{ id: string }>).data.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    const routeId = (
      generated.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0]!.id;

    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 50_000 })
      .expect(201);

    return dispatchId;
  }

  it('registers and lists FCM tokens', async () => {
    const token = `p15_cust_token_${suffix}_abcdefghijklmnopqrst`;
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token })
      .expect(201);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const data = (
      listed.body as Envelope<{ tokens: string[]; tokenCount: number }>
    ).data;
    expect(data.tokens).toContain(token);
    expect(data.tokenCount).toBeGreaterThanOrEqual(1);

    const status = await request(app.getHttpServer())
      .get('/api/v1/notifications/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      (status.body as Envelope<{ configured: boolean }>).data.configured,
    ).toBe(true);
  });

  it('sends on assign, trip status, and chat (3 event types)', async () => {
    const custToken = `p15_c_evt_${suffix}_abcdefghijklmnopqrst`;
    const drvToken = `p15_d_evt_${suffix}_abcdefghijklmnopqrst`;
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token: custToken })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ token: drvToken })
      .expect(201);

    const dispatchId = await createRoutedDispatch();
    sent.length = 0;

    const approve = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(201);
    const tripId = (
      approve.body as Envelope<{ trip: { id: string } }>
    ).data.trip.id;

    await waitForSends(2);
    const assignTypes = sent.map((s) => s.payload.data?.type);
    expect(assignTypes).toEqual(
      expect.arrayContaining(['dispatch.assigned', 'dispatch.assigned']),
    );

    sent.length = 0;
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: TripStatus.EN_ROUTE_PICKUP })
      .expect(201);
    await waitForSends(1);
    expect(sent.some((s) => s.payload.data?.type === 'trip.status')).toBe(true);

    const thread = await request(app.getHttpServer())
      .post(`/api/v1/chat/trips/${tripId}/threads`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ type: ChatThreadType.DRIVER_CUSTOMER })
      .expect(201);
    const threadId = (thread.body as Envelope<{ id: string }>).data.id;

    sent.length = 0;
    await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ type: MessageType.TEXT, body: 'On my way' })
      .expect(201);
    await waitForSends(1);
    expect(sent.some((s) => s.payload.data?.type === 'chat.message')).toBe(
      true,
    );
  });

  it('sends on reject and prunes bad tokens', async () => {
    const dispatchId = await createRoutedDispatch();
    const rejectToken = `p15_reject_${suffix}_abcdefghijklmnopqrst`;
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token: rejectToken })
      .expect(201);

    sent.length = 0;
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'No drivers nearby for this corridor' })
      .expect(201);
    await waitForSends(1);
    expect(sent.some((s) => s.payload.data?.type === 'dispatch.rejected')).toBe(
      true,
    );

    const badToken = `p15_bad_${suffix}_abcdefghijklmnopqrst`;
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token: badToken })
      .expect(201);

    pruneMode = true;
    const result = await notifications.notifyUser(customerId, {
      title: 'Prune test',
      body: 'Should remove bad tokens',
    });
    expect(result.pruned).toBeGreaterThan(0);

    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: { fcmTokens: true },
    });
    expect(user!.fcmTokens).not.toContain(badToken);
  });

  it('unregisters a token', async () => {
    const token = `p15_unreg_${suffix}_abcdefghijklmnopqrst`;
    await request(app.getHttpServer())
      .post('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ token })
      .expect(200);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/notifications/tokens')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      (listed.body as Envelope<{ tokens: string[] }>).data.tokens,
    ).not.toContain(token);
  });
});
