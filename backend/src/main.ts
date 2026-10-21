import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { loadEnv } from './config/load-env';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  let config;
  try {
    config = loadEnv();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger:
      config.nodeEnv === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.use(
    helmet({
      contentSecurityPolicy:
        config.nodeEnv === 'production' ? undefined : false,
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (Flutter / curl) may send no Origin
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Reject silently (browser blocks); do not throw (avoids 500 noise)
      callback(null, false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Captain Truck API')
      .setDescription(
        'Custom NestJS backend for Captain Truck logistics platform.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs: http://localhost:${config.port}/api/docs`);
  }

  if (config.nodeEnv === 'development' && !config.databaseUrl) {
    logger.warn(
      'DATABASE_URL is not set. Phase 2 (Prisma/Neon) will require it.',
    );
  } else if (config.databaseUrl) {
    logger.log(
      'DATABASE_URL loaded (Neon pooled connection ready for Phase 2)',
    );
  }

  try {
    await app.listen(config.port);
    logger.log(
      `Captain Truck API listening on http://localhost:${config.port}`,
    );
    logger.log(`Health: http://localhost:${config.port}/api/v1/health`);
    logger.log(`NODE_ENV=${config.nodeEnv}`);
    logger.log(
      `Rate limit: ${config.throttle.limit} req / ${config.throttle.ttlMs}ms (in-memory; fail-open on restart)`,
    );
    logger.log(
      config.redisUrl
        ? 'REDIS_URL set — live GPS uses Redis'
        : 'REDIS_URL unset — live GPS uses in-memory store (ok for local/test)',
    );
    logger.log(`Socket.IO namespace: /realtime`);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === 'EADDRINUSE') {
      logger.error(
        `Port ${config.port} is already in use. Set PORT to a free port in .env and retry.`,
      );
      process.exit(1);
    }
    throw error;
  }
}

void bootstrap();
