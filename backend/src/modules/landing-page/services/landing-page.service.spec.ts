import { ForbiddenException } from '@nestjs/common';
import { PackageStatus, SiteRevisionStatus } from '@prisma/client';
import { LandingPageService } from './landing-page.service';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import type { FeaturePolicyService } from './feature-policy.service';
import { PUBLIC_FEATURE_DEFAULTS } from './feature-policy.service';

const context: AuthorizationContext = { userId: '00000000-0000-4000-8000-000000000001', sessionId: '00000000-0000-4000-8000-000000000002', workspaceType: 'ORGANIZATION', membershipId: '00000000-0000-4000-8000-000000000005', organizationId: '00000000-0000-4000-8000-000000000003', branchId: null, roles: ['ADMIN'], permissions: new Set<string>(), authenticationStrength: 1, recentAuthenticationAt: new Date(), mfaCompletedAt: null };

type PrismaMock = {
  siteContentRevision: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock; aggregate: jest.Mock; create: jest.Mock };
  siteCampaign: { findMany: jest.Mock };
  package: { findMany: jest.Mock; findFirst: jest.Mock };
  customerReview: { findMany: jest.Mock };
  auditLog: { create: jest.Mock };
  $transaction: jest.Mock;
};

function prismaMock(rows: Array<{ deliveredAt: Date; promisedDeliveryAt: Date }>): PrismaMock {
  return {
    siteContentRevision: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), aggregate: jest.fn(), create: jest.fn() },
    siteCampaign: { findMany: jest.fn().mockResolvedValue([]) },
    package: { findMany: jest.fn().mockResolvedValue(rows), findFirst: jest.fn() },
    customerReview: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
}

const featurePolicy = {
  publicStates: jest.fn().mockResolvedValue(Object.fromEntries(
    Object.entries(PUBLIC_FEATURE_DEFAULTS).map(([key, state]) => [key, { state, version: 0 }]),
  )),
} as unknown as FeaturePolicyService;
const service = (prisma: PrismaMock) => new LandingPageService(prisma as unknown as PrismaService, featurePolicy);

describe('LandingPageService', () => {
  it('never fabricates a public on-time percentage below the minimum sample', async () => {
    const prisma = prismaMock([{ deliveredAt: new Date('2026-07-01T10:00:00Z'), promisedDeliveryAt: new Date('2026-07-01T12:00:00Z') }]);
    const result = await service(prisma).publicPage();
    expect(result.metrics.onTime).toMatchObject({ available: false, reason: 'MINIMUM_SAMPLE_NOT_MET', sampleSize: 1 });
    expect(result.features['public.send_parcel']).toMatchObject({ state: 'COMING_SOON', version: 0 });
    expect(prisma.package.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: PackageStatus.DELIVERED, promisedDeliveryAt: { not: null }, deletedAt: null }) }));
  });

  it('calculates on-time performance on the server from eligible timestamps', async () => {
    const promise = new Date('2026-07-01T12:00:00Z');
    const rows = Array.from({ length: 20 }, (_, index) => ({ deliveredAt: new Date(index < 18 ? '2026-07-01T11:00:00Z' : '2026-07-01T13:00:00Z'), promisedDeliveryAt: promise }));
    const result = await service(prismaMock(rows)).publicPage();
    expect(result.metrics.onTime).toMatchObject({ available: true, percentage: 90, sampleSize: 20 });
  });

  it('blocks creator self-approval before any content mutation', async () => {
    const prisma = prismaMock([]);
    prisma.siteContentRevision.findUnique.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000004', createdById: context.userId, status: SiteRevisionStatus.PENDING_APPROVAL });
    await expect(service(prisma).decideRevision('00000000-0000-4000-8000-000000000004', true, {}, context, 'req-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.siteContentRevision.update).not.toHaveBeenCalled();
  });
});
