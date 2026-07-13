import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { isOriginAllowed } from './config/cors';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix', '/api/v1').replace(/^\/+|\/+$/g, '');
  const port = config.get<number>('port', 4000);
  const bodyLimit = config.get<string>('jsonBodyLimit', '1mb');
  const allowedOrigins = config.get<string[]>('frontendOrigins', []);
  const corsOrigin: CorsOptions['origin'] = (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) callback(null, true);
    else callback(new Error('Origin is not allowed by CORS policy'));
  };

  app.setGlobalPrefix(prefix);
  app.use(cookieParser());
  if (config.get<boolean>('trustProxy', false)) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: false, limit: bodyLimit }));
  app.enableCors({
    credentials: true,
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Token', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'Idempotency-Replayed', 'traceparent'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
