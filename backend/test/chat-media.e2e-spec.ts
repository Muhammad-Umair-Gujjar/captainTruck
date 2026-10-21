import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatThreadType, MessageType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  ChatErrorCode,
  MediaErrorCode,
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

describe('Phase 11 Chat + media (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverToken = '';
  let otherDriverToken = '';
  let driverId = '';
  let truckTypeId = '';
  let tripId = '';

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 10_000,
        durationSeconds: 800,
        polyline: 'p11_poly',
      },
    ]),
  };

  jest.setTimeout(120_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

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
        email: `p11.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P11 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p11.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P11 Driver',
        vehiclePlate: 'LES-P11',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;

    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p11.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (dLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p11.other.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P11 Other',
        vehiclePlate: 'LES-P11B',
      })
      .expect(201);
    const oLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p11.other.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    otherDriverToken = (oLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    // Create assigned trip
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'P11 A',
        dropoffAddress: 'P11 B',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 33.68,
        dropoffLng: 73.04,
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
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 20_000 })
      .expect(201);
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

  it('reports media status and rejects sign without Cloudinary', async () => {
    const status = await request(app.getHttpServer())
      .get('/api/v1/media/status')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      (status.body as Envelope<{ configured: boolean }>).data.configured,
    ).toBe(false);

    const sign = await request(app.getHttpServer())
      .post('/api/v1/media/sign')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ resourceType: 'image' })
      .expect(503);
    expect((sign.body as Envelope<unknown>).error?.code).toBe(
      MediaErrorCode.NOT_CONFIGURED,
    );
  });

  it('opens thread, enforces participants, paginates, validates media URL', async () => {
    const opened = await request(app.getHttpServer())
      .post(`/api/v1/chat/trips/${tripId}/threads`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: ChatThreadType.DRIVER_CUSTOMER })
      .expect(201);

    const threadId = (opened.body as Envelope<{ id: string }>).data.id;

    // Other driver forbidden
    await request(app.getHttpServer())
      .get(`/api/v1/chat/threads/${threadId}`)
      .set('Authorization', `Bearer ${otherDriverToken}`)
      .expect(403);

    const text = await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        type: MessageType.TEXT,
        body: 'Hello <b>driver</b>',
      })
      .expect(201);
    expect((text.body as Envelope<{ body: string }>).data.body).toBe(
      'Hello driver',
    );

    const badMedia = await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        type: MessageType.IMAGE,
        mediaUrl: 'https://evil.example.com/x.jpg',
      })
      .expect(400);
    expect((badMedia.body as Envelope<unknown>).error?.code).toBe(
      MediaErrorCode.INVALID_URL,
    );

    await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        type: MessageType.IMAGE,
        mediaUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/x.jpg',
      })
      .expect(201);

    // Seed more messages for cursor pagination
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/threads/${threadId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ type: MessageType.TEXT, body: `msg-${i}` })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get(`/api/v1/chat/threads/${threadId}/messages?limit=3`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const p1 = page1.body as Envelope<{
      items: Array<{ id: string; body: string | null }>;
      meta: { nextCursor: string | null; hasMore: boolean };
    }>;
    expect(p1.data.items).toHaveLength(3);
    expect(p1.data.meta.hasMore).toBe(true);
    expect(p1.data.meta.nextCursor).toBeTruthy();

    const page2 = await request(app.getHttpServer())
      .get(
        `/api/v1/chat/threads/${threadId}/messages?limit=3&cursor=${p1.data.meta.nextCursor}`,
      )
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const p2 = page2.body as Envelope<{
      items: Array<{ id: string }>;
    }>;
    expect(p2.data.items.length).toBeGreaterThan(0);
    expect(p2.data.items[0].id).not.toBe(p1.data.items[0].id);

    // Tampered cursor
    const badCursor = await request(app.getHttpServer())
      .get(
        `/api/v1/chat/threads/${threadId}/messages?cursor=not-a-real-message-id`,
      )
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);
    expect((badCursor.body as Envelope<unknown>).error?.code).toBe(
      ChatErrorCode.INVALID_CURSOR,
    );

    const msgId = p1.data.items[0].id;
    const reported = await request(app.getHttpServer())
      .post(`/api/v1/chat/messages/${msgId}/report`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(201);
    expect(
      (reported.body as Envelope<{ reported: boolean }>).data.reported,
    ).toBe(true);
  });

  it('locks chat after trip completed', async () => {
    const opened = await request(app.getHttpServer())
      .post(`/api/v1/chat/trips/${tripId}/threads`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: ChatThreadType.DRIVER_CUSTOMER })
      .expect(201);
    const threadId = (opened.body as Envelope<{ id: string }>).data.id;

    const steps = [
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
    ] as const;

    for (const status of steps) {
      await request(app.getHttpServer())
        .post(`/api/v1/trips/${tripId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status })
        .expect(201);
    }

    const locked = await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: MessageType.TEXT, body: 'after complete' })
      .expect(400);
    expect((locked.body as Envelope<unknown>).error?.code).toBe(
      ChatErrorCode.READ_ONLY,
    );

    // Still readable
    await request(app.getHttpServer())
      .get(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
  });
});
