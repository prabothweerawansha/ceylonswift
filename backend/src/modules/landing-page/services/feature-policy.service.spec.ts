import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FeaturePolicyScope, FeaturePolicyState } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { FeaturePolicyService } from './feature-policy.service';

const context: AuthorizationContext = {
  userId: '00000000-0000-4000-8000-000000000001',
  sessionId: '00000000-0000-4000-8000-000000000002',
  workspaceType: 'ORGANIZATION',
  membershipId: '00000000-0000-4000-8000-000000000003',
  organizationId: '00000000-0000-4000-8000-000000000004',
  branchId: '00000000-0000-4000-8000-000000000005',
  roles: ['ADMIN'],
  permissions: new Set(['feature_policy.read', 'feature_policy.manage']),
  authenticationStrength: 2,
  recentAuthenticationAt: new Date(),
  mfaCompletedAt: new Date(),
};

function prismaMock() {
  const tx = {
    featurePolicy: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
  };
  return {
    tx,
    prisma: {
      featurePolicy: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => Promise.resolve(callback(tx))),
    } as unknown as PrismaService,
  };
}

const globalDto = {
  scopeType: FeaturePolicyScope.GLOBAL,
  scopeId: 'GLOBAL',
  state: FeaturePolicyState.ENABLED,
  effectiveFrom: '2026-07-17T00:00:00.000Z',
  expectedVersion: 0,
  reason: 'Approved Open Beta launch state',
};

describe('FeaturePolicyService', () => {
  it('uses restrictive Open Beta defaults and applies active global overrides', async () => {
    const { prisma } = prismaMock();
    (prisma.featurePolicy.findMany as jest.Mock).mockResolvedValue([
      { featureKey: 'public.hubs', state: FeaturePolicyState.ENABLED, version: 3 },
    ]);
    const states = await new FeaturePolicyService(prisma).publicStates(new Date('2026-07-17T12:00:00.000Z'));
    expect(states['public.send_parcel']).toEqual({ state: FeaturePolicyState.COMING_SOON, version: 0 });
    expect(states['public.hubs']).toEqual({ state: FeaturePolicyState.ENABLED, version: 3 });
  });

  it('rejects unknown keys before any database mutation', async () => {
    const { prisma, tx } = prismaMock();
    await expect(new FeaturePolicyService(prisma).upsert('public.unknown', globalDto, context, 'req-1'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(tx.featurePolicy.create).not.toHaveBeenCalled();
  });

  it('rejects stale optimistic versions', async () => {
    const { prisma, tx } = prismaMock();
    tx.featurePolicy.findUnique.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000006', version: 2, state: FeaturePolicyState.COMING_SOON });
    await expect(new FeaturePolicyService(prisma).upsert('public.hubs', { ...globalDto, expectedVersion: 1 }, context, 'req-2'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.featurePolicy.update).not.toHaveBeenCalled();
  });

  it('writes the policy and its audit record in one transaction', async () => {
    const { prisma, tx } = prismaMock();
    const created = { id: '00000000-0000-4000-8000-000000000006', featureKey: 'public.hubs', state: FeaturePolicyState.ENABLED, version: 1 };
    tx.featurePolicy.findUnique.mockResolvedValue(null);
    tx.featurePolicy.create.mockResolvedValue(created);
    await expect(new FeaturePolicyService(prisma).upsert('public.hubs', globalDto, context, 'req-3')).resolves.toEqual(created);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'FEATURE_POLICY_CREATED', resourceType: 'FeaturePolicy', resourceId: created.id }),
    }));
  });

  it('denies a non-elevated administrator from another branch scope', async () => {
    const { prisma } = prismaMock();
    await expect(new FeaturePolicyService(prisma).upsert('public.hubs', {
      ...globalDto,
      scopeType: FeaturePolicyScope.BRANCH,
      scopeId: '00000000-0000-4000-8000-000000000099',
    }, context, 'req-4')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
