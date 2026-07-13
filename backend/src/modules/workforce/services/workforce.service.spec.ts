import { ForbiddenException } from '@nestjs/common';
import { AccountStatus, OrganizationType } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../database/prisma.service';
import type { PasswordService } from '../../auth/services/password.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import type { StepUpPolicyService } from '../../authorization/services/step-up-policy.service';
import { WorkforceRateLimitService } from './workforce-rate-limit.service';
import { WorkforceService } from './workforce.service';

describe('WorkforceService security boundaries', () => {
  const context = (overrides: Partial<AuthorizationContext> = {}): AuthorizationContext => ({ userId: 'actor', sessionId: 'session', workspaceType: 'ORGANIZATION', membershipId: 'membership', organizationId: 'org-a', branchId: 'branch-a', roles: ['ADMIN'], permissions: new Set(['staff.read', 'staff.approve', 'rider.approve']), authenticationStrength: 2, recentAuthenticationAt: new Date(), mfaCompletedAt: new Date(), ...overrides });
  const setup = () => {
    const mocks = {
      employeeFindMany: jest.fn().mockResolvedValue([]), approvalFindMany: jest.fn().mockResolvedValue([]),
      branchFindFirst: jest.fn().mockResolvedValue({ id: 'branch-a' }), organizationFindUnique: jest.fn().mockResolvedValue({ type: OrganizationType.DELIVERY_COMPANY }),
      userFindFirst: jest.fn(), memberFindFirst: jest.fn().mockResolvedValue({ id: 'member' }), transaction: jest.fn(), delivery: jest.fn().mockResolvedValue(undefined), satisfies: jest.fn().mockReturnValue(true), recordRequired: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = { employeeProfile: { findMany: mocks.employeeFindMany }, approvalRequest: { findMany: mocks.approvalFindMany }, branch: { findFirst: mocks.branchFindFirst }, organization: { findUnique: mocks.organizationFindUnique }, organizationMembership: { findFirst: mocks.memberFindFirst }, user: { findFirst: mocks.userFindFirst }, $transaction: mocks.transaction } as unknown as PrismaService;
    const service = new WorkforceService(prisma, {} as PasswordService, { get: jest.fn().mockReturnValue('test') } as unknown as ConfigService, new WorkforceRateLimitService(), { deliver: mocks.delivery }, { satisfies: mocks.satisfies, recordRequired: mocks.recordRequired } as unknown as StepUpPolicyService);
    return { service, mocks };
  };

  it('applies organization and branch scope to the employee directory', async () => {
    const { service, mocks } = setup();
    await service.employees({ limit: 25, sort: 'asc' }, context());
    expect(mocks.employeeFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ primaryBranchId: 'branch-a', user: expect.objectContaining({ memberships: { some: { organizationId: 'org-a' } } }) }), take: 26 }));
  });

  it('filters approval visibility by backend-derived approval permissions', async () => {
    const { service, mocks } = setup();
    await service.approvals({ limit: 25, sort: 'asc' }, context({ permissions: new Set(['staff.read', 'rider.approve']) }));
    expect(mocks.approvalFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a', branchId: 'branch-a', requiredPermission: { in: ['rider.approve'] } }) }));
  });

  it('rejects a foreign branch filter before querying directory data', async () => {
    const { service, mocks } = setup();
    await expect(service.employees({ limit: 25, sort: 'asc', branchId: 'branch-b' }, context())).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.employeeFindMany).not.toHaveBeenCalled();
  });

  it('prevents a partner administrator from inviting an internal role', async () => {
    const { service, mocks } = setup(); mocks.organizationFindUnique.mockResolvedValue({ type: OrganizationType.PARTNER });
    await expect(service.createInvitation({ email: 'person@example.test', branchId: 'branch-a', jobTitle: 'Partner user', roleKeys: ['OFFICE_STAFF'], expiresInMinutes: 60 }, context({ roles: ['PARTNER_ADMIN'] }), 'request')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('revokes sessions and refresh tokens when an account is suspended', async () => {
    const { service, mocks } = setup();
    mocks.userFindFirst.mockResolvedValue({ id: 'target', normalizedEmail: 'target@example.test', normalizedPhone: null, accountStatus: AccountStatus.SUSPENDED, profile: { displayName: 'Target' }, employeeProfile: null, roles: [], createdAt: new Date(), updatedAt: new Date() });
    const tx = { user: { update: jest.fn() }, session: { findMany: jest.fn().mockResolvedValue([{ id: 'session-target' }]), updateMany: jest.fn() }, refreshToken: { updateMany: jest.fn() }, auditLog: { create: jest.fn() } };
    mocks.transaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
    await service.setAccountStatus('target', { status: AccountStatus.SUSPENDED, reason: 'Security response' }, context(), 'request');
    expect(tx.session.updateMany).toHaveBeenCalled(); expect(tx.refreshToken.updateMany).toHaveBeenCalled(); expect(tx.auditLog.create).toHaveBeenCalled();
  });
});
