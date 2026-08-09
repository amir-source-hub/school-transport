import 'reflect-metadata';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';

const outputPath = resolve(process.cwd(), 'openapi.json');
const check = process.argv.includes('--check');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://contract:contract@127.0.0.1:5432/contract';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = 'openapi-contract-generation-secret-32-characters';
process.env.OTP_PROVIDER = 'none';
process.env.SMS_PROVIDER = 'none';
process.env.PAYMENT_GATEWAY_PROVIDER = 'none';

async function main() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { logger: ['error'] },
  );
  app.setGlobalPrefix('api/v1');
  const serialized = `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`;
  await app.close();

  if (check) {
    const committed = await readFile(outputPath, 'utf8').catch(() => '');
    if (committed !== serialized) {
      throw new Error(
        'OpenAPI contract drift detected. Run pnpm contract:generate and commit openapi.json.',
      );
    }
  } else {
    await writeFile(outputPath, serialized, 'utf8');
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
