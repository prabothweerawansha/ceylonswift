import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('API foundation (e2e)', () => {
  let app: INestApplication;
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    isHealthy: jest.fn<Promise<boolean>, []>(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns a successful database-aware health envelope and request ID', async () => {
    prisma.isHealthy.mockResolvedValueOnce(true);
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok', database: 'connected', environment: 'test' },
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('returns the documented error envelope when the database is unavailable', async () => {
    prisma.isHealthy.mockResolvedValueOnce(false);
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'HEALTH_DATABASE_UNAVAILABLE', details: null },
    });
    expect(response.body.requestId).toBeDefined();
  });

  it('provides shallow liveness without requiring the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'alive' } });
  });

  it('reports readiness success and database failure safely', async () => {
    prisma.isHealthy.mockResolvedValueOnce(true);
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200).expect(({ body }) => expect(body.data.status).toBe('ready'));
    prisma.isHealthy.mockResolvedValueOnce(false);
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503).expect(({ body }) => expect(body.error.code).toBe('READINESS_DATABASE_UNAVAILABLE'));
  });

  it('returns a request ID in a not-found error response', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/not-found').expect(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(response.body.requestId).toBeDefined();
  });
});
