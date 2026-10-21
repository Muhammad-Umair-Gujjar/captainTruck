import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DispatchStatus, TripStatus } from '@prisma/client';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TripErrorCode } from '../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { OsrmService } from '../src/modules/osm/osrm.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { LOCATION_THROTTLE_SECONDS } from '../src/modules/trips/trips.service';

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
};

describe('Phase 10 Trips + realtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl = '';
  const suffix = Date.now();
  let adminToken = '';
  let customerToken = '';
  let driverToken = '';
  let otherDriverToken = '';
  let driverId = '';
  let truckTypeId = '';

  const mockOsrm = {
    getRoutes: jest.fn().mockResolvedValue([
      {
        distanceMeters: 10_000,
        durationSeconds: 800,
        polyline: 'p10_poly',
      },
    ]),
  };

  jest.setTimeout(120_000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '1000';
    // Force memory Redis for deterministic e2e
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
    await app.listen(0);
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    baseUrl = `http://127.0.0.1:${port}`;
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
        email: `p10.cust.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'P10 Customer',
      })
      .expect(201);
    customerToken = (reg.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p10.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P10 Driver',
        vehiclePlate: 'LES-P10',
      })
      .expect(201);
    driverId = (
      driver.body as Envelope<{ user: { id: string } }>
    ).data.user.id;

    const driverLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p10.driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    driverToken = (driverLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p10.other.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'P10 Other',
        vehiclePlate: 'LES-P10B',
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p10.other.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    otherDriverToken = (otherLogin.body as Envelope<{ accessToken: string }>)
      .data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAssignedTrip() {
    const created = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'P10 Pickup',
        dropoffAddress: 'P10 Dropoff',
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
      .send({ aiCostCents: 25_000 })
      .expect(201);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${dispatchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(201);

    const tripId = (
      approved.body as Envelope<{ trip: { id: string } }>
    ).data.trip.id;

    return { dispatchId, tripId };
  }

  function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/realtime`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
      });
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error('socket connect timeout'));
      }, 10_000);
      socket.on('connected', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      socket.on('error', (payload) => {
        clearTimeout(timer);
        socket.close();
        reject(new Error(JSON.stringify(payload)));
      });
    });
  }

  it('runs lifecycle, seals GPS, and throttles location', async () => {
    const { dispatchId, tripId } = await createAssignedTrip();

    const steps: TripStatus[] = [
      TripStatus.EN_ROUTE_PICKUP,
      TripStatus.ARRIVED_PICKUP,
      TripStatus.IN_TRANSIT,
      TripStatus.DELIVERED,
      TripStatus.COMPLETED,
    ];

    for (const status of steps) {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/trips/${tripId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status })
        .expect(201);
      expect(
        (res.body as Envelope<{ status: string }>).data.status,
      ).toBe(status);
    }

    // Idempotent complete
    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/status`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: TripStatus.COMPLETED })
      .expect(201);

    const dispatch = await prisma.dispatchRequest.findUnique({
      where: { id: dispatchId },
    });
    expect(dispatch?.status).toBe(DispatchStatus.COMPLETED);

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(trip?.finalBillCents).toBeGreaterThan(0);
    expect(trip?.completedAt).toBeTruthy();

    const sealed = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/location`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 31.5, lng: 74.3 })
      .expect(400);
    expect((sealed.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.GPS_SEALED,
    );

    // Fresh trip for throttle test
    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `p10.throttle.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'Throttle Driver',
        vehiclePlate: 'LES-TH',
      })
      .expect(201);
    const throttleDriverId = (
      other.body as Envelope<{ user: { id: string } }>
    ).data.user.id;
    const tLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p10.throttle.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);
    const tToken = (tLogin.body as Envelope<{ accessToken: string }>).data
      .accessToken;

    // Create second assigned trip with free driver
    const created2 = await request(app.getHttpServer())
      .post('/api/v1/dispatches')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        truckTypeId,
        truckCount: 1,
        pickupAddress: 'P10B',
        dropoffAddress: 'P10C',
        pickupLat: 31.5,
        pickupLng: 74.3,
        dropoffLat: 31.6,
        dropoffLng: 74.4,
      })
      .expect(201);
    const d2 = (created2.body as Envelope<{ id: string }>).data.id;
    const g2 = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${d2}/routes/generate`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);
    const r2 = (
      g2.body as Envelope<{ routeOptions: Array<{ id: string }> }>
    ).data.routeOptions[0].id;
    await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${d2}/routes/${r2}/select`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ aiCostCents: 20_000 })
      .expect(201);
    const a2 = await request(app.getHttpServer())
      .post(`/api/v1/dispatches/${d2}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: throttleDriverId })
      .expect(201);
    const trip2 = (a2.body as Envelope<{ trip: { id: string } }>).data.trip.id;

    await request(app.getHttpServer())
      .post(`/api/v1/trips/${trip2}/location`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ lat: 31.52, lng: 74.35 })
      .expect(201);

    const throttled = await request(app.getHttpServer())
      .post(`/api/v1/trips/${trip2}/location`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ lat: 31.53, lng: 74.36 })
      .expect(429);
    expect((throttled.body as Envelope<unknown>).error?.code).toBe(
      TripErrorCode.LOCATION_THROTTLED,
    );

    await new Promise((r) =>
      setTimeout(r, (LOCATION_THROTTLE_SECONDS + 1) * 1000),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/trips/${trip2}/location`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ lat: 31.54, lng: 74.37 })
      .expect(201);
  });

  it('rejects unauthorized socket trip join', async () => {
    const { tripId } = await createAssignedTrip();

    const otherSocket = await connectSocket(otherDriverToken);
    const joinResult = await new Promise<{ ok: boolean; code?: string }>(
      (resolve, reject) => {
        otherSocket
          .timeout(5000)
          .emit(
            'trip:join',
            { tripId },
            (err: Error | null, res: { ok: boolean; code?: string }) => {
              if (err) reject(err);
              else resolve(res);
            },
          );
      },
    );
    expect(joinResult.ok).toBe(false);
    expect(joinResult.code).toBe(TripErrorCode.FORBIDDEN);
    otherSocket.close();

    const driverSocket = await connectSocket(driverToken);
    const okJoin = await new Promise<{ ok: boolean }>((resolve, reject) => {
      driverSocket
        .timeout(5000)
        .emit(
          'trip:join',
          { tripId },
          (err: Error | null, res: { ok: boolean }) => {
            if (err) reject(err);
            else resolve(res);
          },
        );
    });
    expect(okJoin.ok).toBe(true);
    driverSocket.close();

    // No token → disconnect
    await new Promise<void>((resolve, reject) => {
      const bad = io(`${baseUrl}/realtime`, {
        transports: ['websocket'],
        forceNew: true,
      });
      const timer = setTimeout(() => {
        bad.close();
        reject(new Error('expected disconnect'));
      }, 8000);
      bad.on('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
      bad.on('error', () => {
        // expected
      });
    });
  });
});
