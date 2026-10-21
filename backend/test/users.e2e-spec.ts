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

describe('Phase 4 Users (e2e)', () => {
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

  async function registerCustomer(email: string, password = 'Customer1!') {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: 'Phase4 Customer' })
      .expect(201);
    return res.body as Envelope<{
      accessToken: string;
      user: { id: string; email: string };
    }>;
  }

  async function adminToken() {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@captaintruck.local',
        password: 'Admin@12345',
      })
      .expect(200);
    const body = res.body as Envelope<{ accessToken: string }>;
    return body.data.accessToken;
  }

  it('customer can get and update own profile', async () => {
    const email = `p4.customer.${suffix}@example.com`;
    const reg = await registerCustomer(email);
    const token = reg.data.accessToken;

    const me = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const meBody = me.body as Envelope<{ email: string; fullName: string }>;
    expect(meBody.data.email).toBe(email);

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Updated Name',
        phone: `+92301${String(suffix).slice(-7)}`,
      })
      .expect(200);

    const updatedBody = updated.body as Envelope<{ fullName: string }>;
    expect(updatedBody.data.fullName).toBe('Updated Name');
  });

  it('customer A cannot access admin user endpoints for customer B', async () => {
    const a = await registerCustomer(`p4.a.${suffix}@example.com`);
    const b = await registerCustomer(`p4.b.${suffix}@example.com`);

    const forbidden = await request(app.getHttpServer())
      .get(`/api/v1/users/${b.data.user.id}`)
      .set('Authorization', `Bearer ${a.data.accessToken}`)
      .expect(403);

    const body = forbidden.body as Envelope<unknown>;
    expect(body.error?.code).toBe('AUTH_010');
  });

  it('rejects email taken on profile update', async () => {
    const first = await registerCustomer(`p4.first.${suffix}@example.com`);
    const second = await registerCustomer(`p4.second.${suffix}@example.com`);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${second.data.accessToken}`)
      .send({ email: first.data.user.email })
      .expect(409);

    const body = res.body as Envelope<unknown>;
    expect(body.error?.code).toBe('USER_003');
  });

  it('admin can list users and disable a customer; disabled cannot login', async () => {
    const customer = await registerCustomer(`p4.disable.${suffix}@example.com`);
    const token = await adminToken();

    const list = await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ role: UserRole.CUSTOMER, q: `p4.disable.${suffix}` })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listBody = list.body as Envelope<{
      items: Array<{ id: string }>;
      meta: { total: number };
    }>;
    expect(listBody.data.meta.total).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${customer.data.user.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: UserStatus.DISABLED })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `p4.disable.${suffix}@example.com`,
        password: 'Customer1!',
      })
      .expect(403);

    const loginBody = login.body as Envelope<unknown>;
    expect(loginBody.error?.code).toBe('AUTH_002');
  });

  it('admin cannot disable the last active admin', async () => {
    const token = await adminToken();
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@captaintruck.local' },
    });
    expect(admin).toBeTruthy();

    // Ensure only one active admin for this assertion
    const otherAdmins = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        NOT: { id: admin!.id },
      },
    });
    for (const other of otherAdmins) {
      await prisma.user.update({
        where: { id: other.id },
        data: { status: UserStatus.DISABLED },
      });
    }

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${admin!.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: UserStatus.DISABLED })
      .expect(409);

    const body = res.body as Envelope<unknown>;
    expect(body.error?.code).toBe('USER_005');

    // Restore any admins we temporarily disabled
    for (const other of otherAdmins) {
      await prisma.user.update({
        where: { id: other.id },
        data: { status: UserStatus.ACTIVE },
      });
    }
  });

  it('admin can update driver profile docs metadata', async () => {
    const token = await adminToken();
    const passwordHash = await bcrypt.hash('DriverPass1!', 10);
    const driver = await prisma.user.create({
      data: {
        email: `p4.driver.${suffix}@example.com`,
        fullName: 'P4 Driver',
        passwordHash,
        role: UserRole.DRIVER,
        status: UserStatus.ACTIVE,
        driverProfile: {
          create: {
            licenseNumber: 'OLD-LIC',
            isAvailable: true,
          },
        },
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${driver.id}/driver-profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        docsUrls: ['https://res.cloudinary.com/demo/license.pdf'],
        adminNotes: 'Verified manually',
        licenseNumber: 'NEW-LIC',
      })
      .expect(200);

    const body = res.body as Envelope<{
      driverProfile: {
        docsUrls: string[];
        adminNotes: string;
        licenseNumber: string;
      };
    }>;
    expect(body.data.driverProfile.docsUrls).toContain(
      'https://res.cloudinary.com/demo/license.pdf',
    );
    expect(body.data.driverProfile.adminNotes).toBe('Verified manually');
    expect(body.data.driverProfile.licenseNumber).toBe('NEW-LIC');
  });

  it('rejects oversized/short fullName on update', async () => {
    const reg = await registerCustomer(`p4.empty.${suffix}@example.com`);
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${reg.data.accessToken}`)
      .send({ fullName: 'A' })
      .expect(400);

    const body = res.body as Envelope<unknown>;
    expect(body.success).toBe(false);
  });
});
