import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigins, requireEnv } from './common/env';

async function bootstrap() {
  // Fail fast with a readable message instead of a Prisma error on the first query.
  requireEnv('DATABASE_URL');
  const origins = corsOrigins();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Vercel's proxy sets X-Forwarded-For to the client IP; trusting one hop makes
  // req.ip (and so the rate limiter) see the real client instead of the proxy.
  app.set('trust proxy', 1);
  app.use(helmet());
  // Requests are small (a booking is under 1 kB); refuse anything larger early.
  app.useBodyParser('json', { limit: '10kb' });
  app.useBodyParser('urlencoded', { limit: '10kb', extended: false });
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Runs onModuleDestroy (Prisma disconnect) on SIGTERM/SIGINT
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  // Message only: startup errors can carry connection details.
  console.error(
    error instanceof Error ? error.message : 'API failed to start.',
  );
  process.exit(1);
});
