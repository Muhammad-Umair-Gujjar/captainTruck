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
import { PricingErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 8 Pricing (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let token = '';
  let truckTypeId = '';
  let lockedBaseRateCents = 0;

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 10_000,
        durationSeconds: 800,
        polyline: 'p8_poly',
      },
    ]),
  };

  jest.setTimeout(60_000);

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

    const truck = await prisma.truckType.findFirst({
      where: { code: 'SMALL', isActive: true },
    });
    truckTypeId = truck!.id;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p8.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P8 Customer',
      })
      .expect(201);
    token = (reg.body as Envelope<{ accessToken: string }>).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createWithRoute() {
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        truckTypeId,
        truckCount: 2,
        pickupAddress: 'P8 Pickup',
        dropoffAddress: 'P8 Dropoff',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 33.68,
        dropoffLng: 73.04,
      })
      .expect(201);

    const createdData = (
      created.body as Envelope<{ id: string; lockedBaseRateCents: number }>
    ).data;
    lockedBaseRateCents = createdData.lockedBaseRateCents;
    const dispatchId = createdData.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const routeId = (
      generated.body as Envelope<{
        routeOptions: Array<{ id: string }>;
      }>
    ).data.routeOptions[0].id;

    return { dispatchId, routeId };
  }

  it('computes server-authoritative bill and ignores client total', async () => {
    const { dispatchId, routeId } = await createWithRoute();
    const aiCostCents = 40_000;

    const selected = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aiCostCents,
        clientTotalBillCents: 999,
      })
      .expect(201);

    const body = selected.body as Envelope<{
      status: string;
      billBreakdown: {
        lockedBaseRateCents: number;
        aiTripCostCents: number;
        perTruckCents: number;
        truckCount: number;
        totalBillCents: number;
        authoritative: boolean;
      };
      clientTotalIgnored: number | null;
    }>;

    expect(body.data.status).toBe(DispatchStatus.PENDING_ADMIN);
    expect(body.data.clientTotalIgnored).toBe(999);
    expect(body.data.billBreakdown.authoritative).toBe(true);
    expect(body.data.billBreakdown.lockedBaseRateCents).toBe(
      lockedBaseRateCents,
    );
    expect(body.data.billBreakdown.aiTripCostCents).toBe(aiCostCents);
    expect(body.data.billBreakdown.perTruckCents).toBe(
      lockedBaseRateCents + aiCostCents,
    );
    expect(body.data.billBreakdown.truckCount).toBe(2);
    expect(body.data.billBreakdown.totalBillCents).toBe(
      (lockedBaseRateCents + aiCostCents) * 2,
    );

    const got = await request(app.getHttpServer())
      .get(`/api/v1/dispatches/${dispatchId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const getBody = got.body as Envelope<{
      billBreakdown: { totalBillCents: number } | null;
    }>;
    expect(getBody.data.billBreakdown?.totalBillCents).toBe(
      (lockedBaseRateCents + aiCostCents) * 2,
    );
  });

  it('rejects outlier AI cost vs distance', async () => {
    const { dispatchId, routeId } = await createWithRoute();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aiCostCents: 5_000_000 })
      .expect(400);

    expect((res.body as Envelope<unknown>).error?.code).toBe(
      PricingErrorCode.OUTLIER_AI_COST,
    );
  });

  it('rejects negative AI cost via validation', async () => {
    const { dispatchId, routeId } = await createWithRoute();

    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aiCostCents: -1 })
      .expect(400);
  });

  it('returns training samples endpoint (empty or list)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pricing/training-samples')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as Envelope<unknown[]>;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(20);
  });
});
