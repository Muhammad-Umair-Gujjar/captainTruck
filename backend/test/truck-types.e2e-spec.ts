import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchStatus, PaymentMethod } from '@prisma/client';
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

describe('Phase 5 Truck Types (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();

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
  });

  afterAll(async () => {
    await app.close();
  });

  async function adminToken() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'Admin@12345',
      })
      .expect(200);
    return (res.body as Envelope<{ accessToken: string }>).data.accessToken;
  }

  it('public list returns only active types with current rates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/truck-types')
      .expect(200);

    const body = res.body as Envelope<
      Array<{
        isActive: boolean;
        currentRateCents: number | null;
        code: string;
      }>
    >;
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    for (const item of body.data) {
      expect(item.isActive).toBe(true);
    }
    const small = body.data.find((t) => t.code === 'SMALL');
    expect(small?.currentRateCents).toBeGreaterThan(0);
  });

  it('admin can create truck type and set rate; rejects zero rate', async () => {
    const token = await adminToken();
    const code = `T${String(suffix).slice(-6)}`;

    const created = await request(app.getHttpServer())
      .post('/api/v1/truck-types')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code,
        name: 'Test Truck',
        capacity: '2 ton',
        initialRateCents: 100000,
      })
      .expect(201);

    const createdBody = created.body as Envelope<{
      id: string;
      code: string;
      currentRateCents: number;
    }>;
    expect(createdBody.data.code).toBe(code);
    expect(createdBody.data.currentRateCents).toBe(100000);

    const zero = await request(app.getHttpServer())
      .post(`/api/v1/truck-types/${createdBody.data.id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 0 })
      .expect(400);

    // class-validator Min(1) rejects before service (VALIDATION_ERROR)
    expect((zero.body as Envelope<unknown>).error?.code).toBe(
      'VALIDATION_ERROR',
    );

    const newRate = await request(app.getHttpServer())
      .post(`/api/v1/truck-types/${createdBody.data.id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 175000 })
      .expect(201);

    expect(
      (newRate.body as Envelope<{ amountCents: number }>).data.amountCents,
    ).toBe(175000);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/truck-types/${createdBody.data.id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const historyBody = history.body as Envelope<{
      items: Array<{ amountCents: number }>;
    }>;
    expect(historyBody.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('rate change does not mutate lockedBaseRateCents on existing dispatch', async () => {
    const token = await adminToken();
    const truck = await prisma.truckType.findFirst({
      where: { code: 'MEDIUM' },
    });
    expect(truck).toBeTruthy();

    const admin = await prisma.user.findFirst({
      where: { email: 'admin@captaintruck.local' },
    });
    const customer = await prisma.user.create({
      data: {
        email: `p5.lock.${suffix}@example.com`,
        fullName: 'Lock Customer',
        passwordHash: 'unused',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    const locked = 250000;
    const dispatch = await prisma.dispatchRequest.create({
      data: {
        customerId: customer.id,
        truckTypeId: truck!.id,
        status: DispatchStatus.PENDING_ADMIN,
        truckCount: 1,
        pickupAddress: 'A',
        dropoffAddress: 'B',
        lockedBaseRateCents: locked,
        paymentMethod: PaymentMethod.CASH,
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/truck-types/${truck!.id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amountCents: 999999 })
      .expect(201);

    const after = await prisma.dispatchRequest.findUnique({
      where: { id: dispatch.id },
    });
    expect(after?.lockedBaseRateCents).toBe(locked);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'BASE_RATE_SET',
        actorId: admin!.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('cannot deactivate truck type with open dispatch requests', async () => {
    const token = await adminToken();
    const created = await request(app.getHttpServer())
      .post('/api/v1/truck-types')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: `O${String(suffix).slice(-6)}`,
        name: 'Open Req Truck',
        initialRateCents: 50000,
      })
      .expect(201);

    const truckId = (created.body as Envelope<{ id: string }>).data.id;
    const customer = await prisma.user.findFirst({
      where: { email: `p5.lock.${suffix}@example.com` },
    });

    await prisma.dispatchRequest.create({
      data: {
        customerId: customer!.id,
        truckTypeId: truckId,
        status: DispatchStatus.DRAFT,
        truckCount: 1,
        pickupAddress: 'X',
        dropoffAddress: 'Y',
        lockedBaseRateCents: 50000,
        paymentMethod: PaymentMethod.CASH,
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/truck-types/${truckId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(409);

    expect((res.body as Envelope<unknown>).error?.code).toBe('TRUCK_004');
  });

  it('customer cannot create truck types', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p5.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'Cust',
      })
      .expect(201);

    const token = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/v1/truck-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'NOPE', name: 'Nope' })
      .expect(403);

    expect((res.body as Envelope<unknown>).error?.code).toBe('AUTH_010');
  });
});
