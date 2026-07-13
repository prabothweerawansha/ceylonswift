import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Authorization boundary (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue({ $connect: jest.fn(), $disconnect: jest.fn(), isHealthy: jest.fn() }).compile();
    app = moduleRef.createNestApplication(); app.setGlobalPrefix('api/v1'); await app.init();
  });
  afterAll(async () => { if (app) await app.close(); });

  it.each(['/api/v1/auth/workspaces', '/api/v1/auth/capabilities', '/api/v1/roles', '/api/v1/permissions', '/api/v1/organizations'])('requires authentication for %s', async (path) => {
    const response = await request(app.getHttpServer()).get(path).expect(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'AUTH_REQUIRED' } });
    expect(response.body.requestId).toBeDefined();
  });
  it('does not expose a public provisioning endpoint', async () => {
    await request(app.getHttpServer()).post('/api/v1/provision/super-admin').send({}).expect(404);
  });
  it.each([
    ['get', '/api/v1/users'], ['get', '/api/v1/employees'], ['get', '/api/v1/riders'],
    ['get', '/api/v1/invitations'], ['get', '/api/v1/approvals'],
    ['patch', '/api/v1/users/00000000-0000-0000-0000-000000000001/status'],
    ['post', '/api/v1/invitations'], ['post', '/api/v1/approvals/00000000-0000-0000-0000-000000000001/approve']
  ])('protects workforce endpoint %s %s', async (method, path) => {
    const client = request(app.getHttpServer());
    const response = method === 'get' ? await client.get(path).expect(401) : method === 'patch' ? await client.patch(path).send({}).expect(401) : await client.post(path).send({}).expect(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'AUTH_REQUIRED' } });
  });
  it.each([
    ['get', '/api/v1/packages'], ['post', '/api/v1/packages'], ['get', '/api/v1/customer-requests'],
    ['post', '/api/v1/customer-requests'], ['get', '/api/v1/me/rider/assignments'],
    ['post', '/api/v1/packages/00000000-0000-0000-0000-000000000001/assign'],
    ['post', '/api/v1/packages/00000000-0000-0000-0000-000000000001/status'],
  ])('protects operational endpoint %s %s', async (method, path) => {
    const client = request(app.getHttpServer());
    const response = method === 'get' ? await client.get(path).expect(401) : await client.post(path).send({}).expect(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'AUTH_REQUIRED' } });
  });
  it.each(['/api/v1/internal/metrics', '/api/v1/internal/jobs/runs'])('protects operational readiness endpoint %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
});
