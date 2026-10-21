import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { loadBootstrapEnv } from './config/env.bootstrap';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const { nodeEnv, port } = loadBootstrapEnv();

  const app = await NestFactory.create(AppModule, {
    logger:
      nodeEnv === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

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

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Captain Truck API')
      .setDescription(
        'Custom NestJS backend for Captain Truck logistics platform (Phase 0 scaffold).',
      )
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }

  try {
    await app.listen(port);
    logger.log(`Captain Truck API listening on http://localhost:${port}`);
    logger.log(`Health: http://localhost:${port}/api/v1/health`);
    logger.log(`NODE_ENV=${nodeEnv}`);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. Set PORT to a free port in .env and retry.`,
      );
      process.exit(1);
    }
    throw error;
  }
}

void bootstrap();
