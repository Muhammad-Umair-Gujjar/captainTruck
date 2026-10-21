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
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { ChatRetentionService } from '../src/modules/chat/chat-retention.service';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 12 Chat retention (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  let retention: ChatRetentionService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverToken = '';
  let driverId = '';
  let truckTypeId = '';
  let tripId = '';
  let threadId = '';

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 8_000,
        durationSeconds: 600,
        polyline: 'p12_poly',
      },
    ]),
  };

  jest.setTimeout(120_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';
    process.env.CHAT_TTL_DAYS = '90';
    delete process.env.REDIS_URL;

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
    redis = app.get(RedisService);
    retention = app.get(ChatRetentionService);

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
        email: `p12.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P12 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p12.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P12 Driver',
        vehiclePlate: 'LES-P12',
      })
      .expect(201);
    driverId = (driver.body as Envelope<{ user: { id: string } }>).data.user.id;

    const dLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p12.driver.${suffix}@example.com`,
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
        pickupAddress: 'P12 A',
        dropoffAddress: 'P12 B',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
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
      .send({ aiCostCents: 15_000 })
      .expect(201);
    const approved = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(201);
    tripId = (approved.body as Envelope<{ trip: { id: string } }>).data.trip.id;

    const thread = await request(app.getHttpServer())
      .post(`/api/v1/chat/trips/${tripId}/threads`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: ChatThreadType.DRIVER_CUSTOMER })
      .expect(201);
    threadId = (thread.body as Envelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deletes messages older than TTL and skips when lock held', async () => {
    const fresh = await request(app.getHttpServer())
      .post(`/api/v1/chat/threads/${threadId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: MessageType.TEXT, body: 'keep-me-fresh' })
      .expect(201);
    const freshId = (fresh.body as Envelope<{ id: string }>).data.id;

    const customer = await prisma.user.findFirst({
      where: { email: `p12.cust.${suffix}@example.com` },
    });

    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days
    const old = await prisma.message.create({
      data: {
        threadId,
        senderId: customer!.id,
        type: MessageType.TEXT,
        body: 'old-message-to-purge',
        createdAt: oldDate,
      },
    });

    const locked = await redis.setNxEx(
      'chat:retention:lock',
      'test-holder',
      60,
    );
    expect(locked).toBe(true);

    const skipped = await request(app.getHttpServer())
      .post('/api/v1/chat/retention/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    const skipBody = skipped.body as Envelope<{
      ran: boolean;
      skippedLocked: boolean;
      deletedMessages: number;
    }>;
    expect(skipBody.data.skippedLocked).toBe(true);
    expect(skipBody.data.ran).toBe(false);

    await redis.del('chat:retention:lock');

    const ran = await request(app.getHttpServer())
      .post('/api/v1/chat/retention/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    const runBody = ran.body as Envelope<{
      ran: boolean;
      deletedMessages: number;
      ttlDays: number;
    }>;
    expect(runBody.data.ran).toBe(true);
    expect(runBody.data.ttlDays).toBe(90);
    expect(runBody.data.deletedMessages).toBeGreaterThanOrEqual(1);

    const oldGone = await prisma.message.findUnique({ where: { id: old.id } });
    expect(oldGone).toBeNull();

    const freshStill = await prisma.message.findUnique({
      where: { id: freshId },
    });
    expect(freshStill).toBeTruthy();

    // Idempotent second run
    const again = await retention.runCleanup();
    expect(again.ran).toBe(true);
    expect(again.deletedMessages).toBe(0);

    // Non-admin forbidden
    await request(app.getHttpServer())
      .post('/api/v1/chat/retention/run')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });
});
