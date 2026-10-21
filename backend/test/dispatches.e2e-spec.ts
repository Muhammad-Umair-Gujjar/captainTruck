import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 6 Dispatches (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let customerToken = '';
  let customerId = '';
  let otherToken = '';
  let truckTypeId = '';
  let lockedRate = 0;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    const rate = await prisma.baseRate.findFirst({
      where: { truckTypeId, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });
    lockedRate = rate!.amountCents;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p6.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P6 Customer',
      })
      .expect(201);
    const regBody = reg.body as Envelope<{
      accessToken: string;
      user: { id: string };
    }>;
    customerToken = regBody.data.accessToken;
    customerId = regBody.data.user.id;

    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p6.other.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'Other Customer',
      })
      .expect(201);
    otherToken = (other.body as Envelope<{ accessToken: string }>).data
      .accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates dispatch and locks base rate at create time', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 2,
        pickupAddress: 'Lahore Warehouse',
        dropoffAddress: 'Islamabad Site',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 33.68,
        dropoffLng: 73.04,
        notes: 'Fragile',
      })
      .expect(201);

    const body = res.body as Envelope<{
      id: string;
      status: string;
      lockedBaseRateCents: number;
      customerId: string;
      truckCount: number;
    }>;

    expect(body.data.status).toBe(DispatchStatus.AWAITING_ROUTE_SELECTION);
    expect(body.data.lockedBaseRateCents).toBe(lockedRate);
    expect(body.data.customerId).toBe(customerId);
    expect(body.data.truckCount).toBe(2);
  });

  it('rejects same pickup/dropoff and past pickupAt', async () => {
    const same = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Same Place',
        dropoffAddress: 'same place',
      })
      .expect(400);
    expect((same.body as Envelope<unknown>).error?.code).toBe('DISPATCH_005');

    const past = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'A Street',
        dropoffAddress: 'B Street',
        pickupAt: new Date(Date.now() - 3600_000).toISOString(),
      })
      .expect(400);
    expect((past.body as Envelope<unknown>).error?.code).toBe('DISPATCH_004');
  });

  it('customer lists only own requests; other customer forbidden', async () => {
    const mine = await request(app.getHttpServer())
      .get('/api/v1/dispatches/mine')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const mineBody = mine.body as Envelope<{
      items: Array<{ id: string; customerId: string }>;
    }>;
    expect(mineBody.data.items.length).toBeGreaterThanOrEqual(1);
    for (const item of mineBody.data.items) {
      expect(item.customerId).toBe(customerId);
    }

    const id = mineBody.data.items[0].id;
    const forbidden = await request(app.getHttpServer())
      .get(`/api/v1/dispatches/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect((forbidden.body as Envelope<unknown>).error?.code).toBe(
      'DISPATCH_002',
    );
  });

  it('draft submit and cancel work with status machine', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Draft Pickup',
        dropoffAddress: 'Draft Drop',
        asDraft: true,
      })
      .expect(201);

    const draftBody = draft.body as Envelope<{ id: string; status: string }>;
    expect(draftBody.data.status).toBe(DispatchStatus.DRAFT);

    const submitted = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${draftBody.data.id}/submit`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    expect((submitted.body as Envelope<{ status: string }>).data.status).toBe(
      DispatchStatus.AWAITING_ROUTE_SELECTION,
    );

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${draftBody.data.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    expect((cancelled.body as Envelope<{ status: string }>).data.status).toBe(
      DispatchStatus.CANCELLED,
    );
  });

  it('unauthenticated create returns 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'A',
        dropoffAddress: 'B',
      })
      .expect(401);
  });

  it('rejects absurd truckCount via validation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 99,
        pickupAddress: 'A Place',
        dropoffAddress: 'B Place',
      })
      .expect(400);

    expect((res.body as Envelope<unknown>).error?.code).toBe(
      'VALIDATION_ERROR',
    );
  });
});
