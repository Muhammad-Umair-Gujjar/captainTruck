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
import { OsmErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { appHttpError } from '../src/common/utils/http-error';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 7 Routing (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let token = '';
  let truckTypeId = '';

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 12000,
        durationSeconds: 900,
        polyline: 'mock_poly_fast',
      },
      {
        distanceMeters: 15000,
        durationSeconds: 1100,
        polyline: 'mock_poly_alt',
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
        email: `p7.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P7 Customer',
      })
      .expect(201);
    token = (reg.body as Envelope<{ accessToken: string }>).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates alternatives, marks fastest recommended, select → pending_admin', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Lahore A',
        dropoffAddress: 'Islamabad B',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 33.68,
        dropoffLng: 73.04,
      })
      .expect(201);

    const dispatchId = (created.body as Envelope<{ id: string }>).data.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const genBody = generated.body as Envelope<{
      status: string;
      routeOptions: Array<{
        id: string;
        isRecommended: boolean;
        durationSeconds: number;
        polyline: string;
      }>;
    }>;

    expect(genBody.data.routeOptions).toHaveLength(2);
    const recommended = genBody.data.routeOptions.find((r) => r.isRecommended);
    expect(recommended?.durationSeconds).toBe(900);
    expect(mockOsrm.getRoutes).toHaveBeenCalled();

    const selected = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${recommended!.id}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aiCostCents: 50_000,
        clientTotalBillCents: 1, // ignored — server bill is authoritative
      })
      .expect(201);

    const selBody = selected.body as Envelope<{
      status: string;
      routeOptions: Array<{ id: string; isSelected: boolean; aiCostCents: number }>;
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
    expect(selBody.data.status).toBe(DispatchStatus.PENDING_ADMIN);
    expect(
      selBody.data.routeOptions.find((r) => r.id === recommended!.id)
        ?.isSelected,
    ).toBe(true);
    expect(
      selBody.data.routeOptions.find((r) => r.id === recommended!.id)
        ?.aiCostCents,
    ).toBe(50_000);
    expect(selBody.data.billBreakdown.authoritative).toBe(true);
    expect(selBody.data.billBreakdown.aiTripCostCents).toBe(50_000);
    expect(selBody.data.billBreakdown.totalBillCents).toBe(
      selBody.data.billBreakdown.perTruckCents,
    );
    expect(selBody.data.clientTotalIgnored).toBe(1);

    // Idempotent re-select of same route
    const again = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${recommended!.id}/select`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aiCostCents: 50_000 })
      .expect(201);
    expect((again.body as Envelope<{ status: string }>).data.status).toBe(
      DispatchStatus.PENDING_ADMIN,
    );
  });

  it('falls back to single route when OSRM returns one', async () => {
    mockOsrm.getRoutes.mockResolvedValueOnce([
      {
        distanceMeters: 8000,
        durationSeconds: 600,
        polyline: 'single',
      },
    ]);

    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Karachi A',
        dropoffAddress: 'Karachi B',
        pickupLat: 24.86,
        pickupLng: 67.0,
        dropoffLat: 24.9,
        dropoffLng: 67.1,
      })
      .expect(201);

    const id = (created.body as Envelope<{ id: string }>).data.id;
    const generated = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${id}/routes/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const body = generated.body as Envelope<{
      routeOptions: Array<{ isRecommended: boolean }>;
    }>;
    expect(body.data.routeOptions).toHaveLength(1);
    expect(body.data.routeOptions[0].isRecommended).toBe(true);
  });

  it('surfaces OSRM failure without crashing', async () => {
    mockOsrm.getRoutes.mockRejectedValueOnce(
      appHttpError(
        503,
        OsmErrorCode.UNAVAILABLE,
        'Routing service unavailable',
      ),
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${token}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'Fail A',
        dropoffAddress: 'Fail B',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
      })
      .expect(201);

    const id = (created.body as Envelope<{ id: string }>).data.id;
    const res = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${id}/routes/generate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    expect((res.body as Envelope<unknown>).error?.code).toBe('OSM_001');
  });
});
