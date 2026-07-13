import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { IdempotencyState } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { IdempotencyService } from './idempotency.service';
import { MetricsService } from './metrics.service';

describe('IdempotencyService', () => {
  const context: AuthorizationContext = { userId: '00000000-0000-0000-0000-000000000001', sessionId: 's', workspaceType: 'ORGANIZATION', membershipId: 'm', organizationId: '00000000-0000-0000-0000-000000000002', branchId: null, roles: ['ADMIN'], permissions: new Set(), authenticationStrength: 1, recentAuthenticationAt: new Date(), mfaCompletedAt: null };

  it('executes once, stores a redacted response, and replays the result', async () => {
    let record: Record<string, unknown> | null = null;
    const delegate = {
      idempotencyRecord: {
        findFirst: jest.fn(() => Promise.resolve(record)),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => { record = { id: 'record', state: IdempotencyState.IN_PROGRESS, lockedAt: new Date(), responseBody: null, responseStatus: null, ...data }; return Promise.resolve(record); }),
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => { record = { ...record, ...data }; return Promise.resolve(record); }),
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
    };
    const prisma = { idempotencyRecord: delegate.idempotencyRecord, $transaction: (callback: (tx: typeof delegate) => unknown) => callback(delegate) } as unknown as PrismaService;
    const config = { get: (_key: string, fallback: unknown) => fallback } as ConfigService;
    const service = new IdempotencyService(prisma, config, new MetricsService());
    let calls = 0;
    const input = { key: 'phase8-key-1234', method: 'POST', endpoint: '/packages', body: { value: 1 }, params: {}, context };
    const first = await service.execute(input, 201, () => { calls += 1; return Promise.resolve({ id: 'package', recipientPhone: '+94123456789', deliveryAddress: { line1: 'private' } }); });
    const replay = await service.execute(input, 201, () => { calls += 1; return Promise.resolve({ id: 'duplicate' }); });
    expect(calls).toBe(1);
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.value).toEqual({ id: 'package', recipientPhone: '[REDACTED]', deliveryAddress: '[REDACTED]' });
  });

  it('rejects reuse with a different fingerprint', async () => {
    const existing = { id: 'record', state: IdempotencyState.COMPLETED, lockedAt: new Date(), expiresAt: new Date(Date.now() + 10000), requestHash: 'different', responseBody: {}, responseStatus: 201 };
    const delegate = { idempotencyRecord: { findFirst: jest.fn(() => Promise.resolve(existing)) } };
    const prisma = { $transaction: (callback: (tx: typeof delegate) => unknown) => callback(delegate) } as unknown as PrismaService;
    const config = { get: (_key: string, fallback: unknown) => fallback } as ConfigService;
    const service = new IdempotencyService(prisma, config, new MetricsService());
    await expect(service.execute({ key: 'phase8-key-1234', method: 'POST', endpoint: '/packages', body: { changed: true }, params: {}, context }, 201, () => Promise.resolve({}))).rejects.toBeInstanceOf(ConflictException);
  });
});
