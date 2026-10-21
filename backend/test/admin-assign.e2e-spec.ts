import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchStatus, TripStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DispatchErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 9 Admin assign (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverId = '';
  let driverToken = '';
  let otherDriverId = '';
  let truckTypeId = '';

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 10_000,
        durationSeconds: 800,
        polyline: 'p9_poly',
      },
    ]),
  };

  jest.setTimeout(90_000);

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'Admin@12345',
      })
      .expect(200);
    adminToken = (adminLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `p9.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P9 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p9.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P9 Driver',
        vehiclePlate: 'LES-P9-1',
      })
      .expect(201);
    driverId = (
      driver.body as Envelope<{ user: { id: string } }>
    ).data.user.id;

    const driverLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p9.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (driverLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p9.driver2.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P9 Driver Two',
        vehiclePlate: 'LES-P9-2',
      })
      .expect(201);
    otherDriverId = (
      other.body as Envelope<{ user: { id: string } }>
    ).data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPendingDispatch() {
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 2,
        pickupAddress: 'P9 Pickup',
        dropoffAddress: 'P9 Dropoff',
        pickupLat: 31.52,
        pickupLng: 74.35,
        dropoffLat: 33.68,
        dropoffLng: 73.04,
      })
      .expect(201);

    const dispatchId = (created.body as Envelope<{ id: string }>).data.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/generate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    const routeId = (
      generated.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/routes/${routeId}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 30_000 })
      .expect(201);

    return dispatchId;
  }

  it('lists pending queue and rejects without reason', async () => {
    const dispatchId = await createPendingDispatch();

    const pending = await request(app.getHttpServer())
      .get('/api/v1/dispatches/admin/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const items = (
      pending.body as Envelope<{ items: Array<{ id: string; status: string }> }>
    ).data.items;
    expect(items.some((i) => i.id === dispatchId)).toBe(true);
    expect(items.every((i) => i.status === DispatchStatus.PENDING_ADMIN)).toBe(
      true,
    );

    const bad = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'no' })
      .expect(400);
    expect((bad.body as Envelope<unknown>).error?.code).toBeDefined();

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'No coverage in that zone tonight' })
      .expect(201);

    const body = rejected.body as Envelope<{
      status: string;
      rejectionReason: string;
    }>;
    expect(body.data.status).toBe(DispatchStatus.REJECTED);
    expect(body.data.rejectionReason).toContain('No coverage');

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: dispatchId, action: 'DISPATCH_REJECT' },
    });
    expect(audit).toBeTruthy();
  });

  it('approves with driver atomically and hides from other drivers', async () => {
    const dispatchId = await createPendingDispatch();

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId, note: 'Lead for 2 trucks' })
      .expect(201);

    const body = approved.body as Envelope<{
      status: string;
      trip: { id: string; driverId: string; status: string };
    }>;
    expect(body.data.status).toBe(DispatchStatus.APPROVED_ASSIGNED);
    expect(body.data.trip.driverId).toBe(driverId);
    expect(body.data.trip.status).toBe(TripStatus.ASSIGNED);

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: dispatchId, action: 'DISPATCH_APPROVE_ASSIGN' },
    });
    expect(audit).toBeTruthy();

    const mine = await request(app.getHttpServer())
      .get('/api/v1/trips/mine')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    const myTrips = (
      mine.body as Envelope<{ items: Array<{ id: string; requestId: string }> }>
    ).data.items;
    expect(myTrips.some((t) => t.requestId === dispatchId)).toBe(true);

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p9.driver2.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    const otherToken = (otherLogin.body as Envelope<{ accessToken: string }>)
      .data.accessToken;

    const otherMine = await request(app.getHttpServer())
      .get('/api/v1/trips/mine')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    const otherTrips = (
      otherMine.body as Envelope<{ items: Array<{ requestId: string }> }>
    ).data.items;
    expect(otherTrips.some((t) => t.requestId === dispatchId)).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/v1/trips/${body.data.trip.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    // Busy driver cannot take another
    const second = await createPendingDispatch();
    const busy = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${second}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(409);
    expect((busy.body as Envelope<unknown>).error?.code).toBe(
      DispatchErrorCode.DRIVER_BUSY,
    );

    // Other free driver can
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${second}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: otherDriverId })
      .expect(201);
  });

  it('rejects approve without driverId', async () => {
    const dispatchId = await createPendingDispatch();
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });
});
