import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

type HealthEnvelope = {
  success: boolean;
  data: {
    status: string;
    service: string;
    phase: number;
  };
  meta: {
    correlationId: string | null;
  };
};

describe('Phase 1 (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '120';

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns enveloped ok with correlation id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-correlation-id', 'test-correlation-1')
      .expect(200);

    expect(res.headers['x-correlation-id']).toBe('test-correlation-1');

    const body = res.body as HealthEnvelope;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.service).toBe('captain-truck-api');
    expect(body.data.phase).toBe(1);
    expect(body.meta.correlationId).toBe('test-correlation-1');
  });
});

describe('Phase 1 rate limit (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '3';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 with Retry-After after exceeding limit', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/v1/health').expect(200);
    await request(server).get('/api/v1/health').expect(200);
    await request(server).get('/api/v1/health').expect(200);

    const limited = await request(server).get('/api/v1/health').expect(429);
    expect(limited.headers['retry-after']).toBeDefined();

    const body = limited.body as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
