/**
 * Export OpenAPI JSON for Flutter / admin clients.
 * Requires a prior `npm run build` (loads compiled AppModule).
 * Usage: npm run openapi:export
 */
process.env.NODE_ENV ??= 'development';
process.env.CORS_ORIGINS ??= 'http://localhost:5173';
process.env.THROTTLE_TTL_MS ??= '60000';
process.env.THROTTLE_LIMIT ??= '120';

const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module');

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Captain Truck API')
    .setDescription(
      'NestJS backend for Captain Truck. See docs/OPENAPI_FLUTTER.md.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const out = join(__dirname, '..', 'docs', 'openapi.json');
  writeFileSync(out, JSON.stringify(document, null, 2), 'utf8');
  process.stdout.write(
    `Wrote ${out} (${Object.keys(document.paths ?? {}).length} paths)\n`,
  );
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
