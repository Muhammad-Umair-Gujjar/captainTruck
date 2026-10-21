import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

describe('Phase 3 Auth (e2e)', () => {
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

  it('registers a customer and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `customer.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'Test Customer',
        phone: `+92300${String(suffix).slice(-7)}`,
      })
      .expect(201);

    const body = res.body as Envelope<{
      user: { role: string; email: string };
      accessToken: string;
      refreshToken: string;
    }>;

    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe(UserRole.CUSTOMER);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('rejects duplicate email (case-insensitive)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `Customer.${suffix}@example.com`,
        password: 'Customer1!',
        fullName: 'Dup Customer',
      })
      .expect(409);

    const body = res.body as Envelope<unknown>;
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('AUTH_003');
  });

  it('logs in seeded admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'Admin@12345',
      })
      .expect(200);

    const body = res.body as Envelope<{
      user: { role: string };
      accessToken: string;
    }>;
    expect(body.data.user.role).toBe(UserRole.ADMIN);
    expect(body.data.accessToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'WrongPass1!',
      })
      .expect(401);

    const body = res.body as Envelope<unknown>;
    expect(body.error?.code).toBe('AUTH_001');
  });

  it('admin creates driver; driver can login; customer cannot create driver', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'Admin@12345',
      })
      .expect(200);

    const adminBody = adminLogin.body as Envelope<{ accessToken: string }>;
    const adminToken = adminBody.data.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `driver.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'Test Driver',
        licenseNumber: 'LIC-001',
      })
      .expect(201);

    const createdBody = created.body as Envelope<{ user: { role: string } }>;
    expect(createdBody.data.user.role).toBe(UserRole.DRIVER);

    const driverLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `driver.${suffix}@example.com`,
        password: 'DriverPass1!',
      })
      .expect(200);

    const driverBody = driverLogin.body as Envelope<{ user: { role: string } }>;
    expect(driverBody.data.user.role).toBe(UserRole.DRIVER);

    const customerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `customer.${suffix}@example.com`,
        password: 'Customer1!',
      })
      .expect(200);

    const customerBody = customerLogin.body as Envelope<{
      accessToken: string;
    }>;
    const customerToken = customerBody.data.accessToken;

    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/auth/drivers')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        email: `driver2.${suffix}@example.com`,
        password: 'DriverPass1!',
        fullName: 'Blocked Driver',
      })
      .expect(403);

    const forbiddenBody = forbidden.body as Envelope<unknown>;
    expect(forbiddenBody.error?.code).toBe('AUTH_010');
  });

  it('rotates refresh token and rejects reuse', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `customer.${suffix}@example.com`,
        password: 'Customer1!',
      })
      .expect(200);

    const loginBody = login.body as Envelope<{ refreshToken: string }>;
    const oldRefresh = loginBody.data.refreshToken;

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);

    const rotatedBody = rotated.body as Envelope<{ refreshToken: string }>;
    expect(rotatedBody.data.refreshToken).toBeDefined();
    expect(rotatedBody.data.refreshToken).not.toBe(oldRefresh);

    const reuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);

    const reuseBody = reuse.body as Envelope<unknown>;
    expect(reuseBody.error?.code).toBe('AUTH_007');
  });

  it('GET /auth/me works with access token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `customer.${suffix}@example.com`,
        password: 'Customer1!',
      })
      .expect(200);

    const loginBody = login.body as Envelope<{ accessToken: string }>;

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginBody.data.accessToken}`)
      .expect(200);

    const meBody = me.body as Envelope<{ email: string }>;
    expect(meBody.data.email).toBe(`customer.${suffix}@example.com`);
  });

  it('rejects disabled user login', async () => {
    const email = `disabled.${suffix}@example.com`;
    const passwordHash = await bcrypt.hash('Disabled1!', 10);
    await prisma.user.create({
      data: {
        email,
        fullName: 'Disabled User',
        passwordHash,
        role: UserRole.CUSTOMER,
        status: UserStatus.DISABLED,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Disabled1!' })
      .expect(403);

    const body = res.body as Envelope<unknown>;
    expect(body.error?.code).toBe('AUTH_002');
  });
});
