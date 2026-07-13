import { ForbiddenException } from '@nestjs/common';
import { BranchStatus, MembershipStatus, OrganizationStatus, SessionStatus } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import type { AccessTokenService } from '../../auth/services/access-token.service';
import type { AuthAuditService } from '../../auth/services/audit.service';
import type { AuthorizationContext } from '../types/authorization-context';
import type { PermissionResolverService } from './permission-resolver.service';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  const membership = { id: 'membership-a', userId: 'user', organizationId: 'org-a', defaultBranchId: 'branch-a', status: MembershipStatus.ACTIVE, startsAt: null, endsAt: null, organization: { id: 'org-a', name: 'Organization A', status: OrganizationStatus.ACTIVE, deletedAt: null }, defaultBranch: { id: 'branch-a', organizationId: 'org-a', status: BranchStatus.ACTIVE, deletedAt: null } };
  const authorization: AuthorizationContext = { userId: 'user', sessionId: 'session', workspaceType: 'ORGANIZATION', membershipId: 'membership-a', organizationId: 'org-a', branchId: 'branch-a', roles: ['ADMIN'], permissions: new Set(['role.read']), authenticationStrength: 1, recentAuthenticationAt: new Date(), mfaCompletedAt: null };
  const setup = () => {
    const mocks = {
      membershipFindMany: jest.fn().mockResolvedValue([membership]), membershipFindFirst: jest.fn().mockResolvedValue(membership),
      roleFindMany: jest.fn().mockResolvedValue([{ organizationId: 'org-a', branchId: null, role: { key: 'ADMIN' } }]), roleFindFirst: jest.fn(),
      sessionFindFirst: jest.fn().mockResolvedValue({ id: 'session', userId: 'user', status: SessionStatus.ACTIVE }), sessionUpdate: jest.fn().mockResolvedValue({}),
      tokenIssue: jest.fn().mockReturnValue({ token: 'access-token', expiresIn: 900 }), auditRecord: jest.fn().mockResolvedValue(undefined), resolve: jest.fn().mockResolvedValue(authorization),
    };
    const prisma = { organizationMembership: { findMany: mocks.membershipFindMany, findFirst: mocks.membershipFindFirst }, userRole: { findMany: mocks.roleFindMany, findFirst: mocks.roleFindFirst }, session: { findFirst: mocks.sessionFindFirst, update: mocks.sessionUpdate } } as unknown as PrismaService;
    const service = new WorkspaceService(prisma, { issue: mocks.tokenIssue } as unknown as AccessTokenService, { record: mocks.auditRecord } as unknown as AuthAuditService, { resolve: mocks.resolve } as unknown as PermissionResolverService);
    return { service, mocks };
  };
  it('lists only derived personal and active membership workspaces', async () => {
    const { service, mocks } = setup();
    mocks.roleFindMany.mockResolvedValueOnce([{ role: { key: 'CUSTOMER' } }]).mockResolvedValueOnce([{ role: { key: 'ADMIN' } }]);
    const result = await service.list('user');
    expect(result.workspaces).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'personal:user', type: 'PERSONAL' }), expect.objectContaining({ id: 'membership-a', organizationId: 'org-a', roles: ['ADMIN'] })]));
  });
  it('selects a server-resolved workspace, updates the session, audits, and refreshes access context', async () => {
    const { service, mocks } = setup(); const result = await service.select('user', 'session', 'membership-a', 'request');
    expect(mocks.sessionUpdate).toHaveBeenCalledWith({ where: { id: 'session' }, data: { selectedMembershipId: 'membership-a', selectedOrganizationId: 'org-a', selectedBranchId: 'branch-a' } });
    expect(mocks.auditRecord).toHaveBeenCalledWith('WORKSPACE_SELECTED', 'SUCCESS', 'request', 'user', 'session', expect.objectContaining({ membershipId: 'membership-a' }));
    expect(result).toMatchObject({ accessToken: 'access-token', workspace: { organizationId: 'org-a' } });
  });
  it('rejects a foreign or suspended workspace and records denial', async () => {
    const { service, mocks } = setup(); mocks.membershipFindFirst.mockResolvedValue(null);
    await expect(service.select('user', 'session', 'foreign-membership', 'request')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mocks.sessionUpdate).not.toHaveBeenCalled(); expect(mocks.auditRecord).toHaveBeenCalledWith('WORKSPACE_SELECTION_DENIED', 'DENIED', 'request', 'user', 'session');
  });
  it('rejects a branch that does not belong to the membership organization', async () => {
    const { service, mocks } = setup(); mocks.membershipFindFirst.mockResolvedValue({ ...membership, defaultBranch: { ...membership.defaultBranch, organizationId: 'org-b' } });
    await expect(service.select('user', 'session', 'membership-a', 'request')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
