import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { BranchStatus, MembershipStatus, OrganizationStatus, SessionStatus } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import { PermissionResolverService } from './permission-resolver.service';

describe('PermissionResolverService', () => {
  const activeSession = { id: 'session', userId: 'user', status: SessionStatus.ACTIVE, authenticationStrength: 1, recentAuthenticationAt: new Date(), mfaCompletedAt: null, selectedMembershipId: 'membership', selectedOrganizationId: 'org-a', selectedBranchId: 'branch-a', selectedBranch: { id: 'branch-a', organizationId: 'org-a', status: BranchStatus.ACTIVE, deletedAt: null }, selectedMembership: { id: 'membership', userId: 'user', organizationId: 'org-a', defaultBranchId: 'branch-a', status: MembershipStatus.ACTIVE, startsAt: null, endsAt: null, organization: { status: OrganizationStatus.ACTIVE, deletedAt: null }, defaultBranch: { id: 'branch-a' } } };
  const assignment = (role: string, permissions: string[], branchId: string | null = null) => ({ organizationId: 'org-a', branchId, role: { key: role, permissions: permissions.map((key) => ({ permission: { key } })) } });
  const setup = (session: unknown = activeSession, assignments: unknown[] = [assignment('ADMIN', ['role.read'])]) => {
    const sessionFindFirst = jest.fn().mockResolvedValue(session);
    const roleFindMany = jest.fn().mockResolvedValue(assignments);
    const prisma = { session: { findFirst: sessionFindFirst }, userRole: { findMany: roleFindMany } } as unknown as PrismaService;
    return { service: new PermissionResolverService(prisma), sessionFindFirst, roleFindMany };
  };

  it('deduplicates permissions from multiple roles', async () => {
    const { service } = setup(activeSession, [assignment('ADMIN', ['role.read', 'audit.read']), assignment('BRANCH_MANAGER', ['role.read', 'branch.read'], 'branch-a')]);
    const result = await service.resolve('user', 'session');
    expect(result.roles).toEqual(['ADMIN', 'BRANCH_MANAGER']);
    expect([...result.permissions]).toEqual(['role.read', 'audit.read', 'branch.read']);
  });
  it('fails closed for invalid sessions', async () => await expect(setup(null).service.resolve('user', 'session')).rejects.toBeInstanceOf(UnauthorizedException));
  it.each([
    ['suspended membership', { selectedMembership: { ...activeSession.selectedMembership, status: MembershipStatus.SUSPENDED } }],
    ['revoked membership', { selectedMembership: { ...activeSession.selectedMembership, status: MembershipStatus.REVOKED } }],
    ['wrong organization', { selectedOrganizationId: 'org-b' }],
    ['wrong branch organization', { selectedBranch: { ...activeSession.selectedBranch, organizationId: 'org-b' } }],
  ])('rejects %s', async (_name, changes) => {
    await expect(setup({ ...activeSession, ...changes }).service.resolve('user', 'session')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('fails closed when selected scope exists without membership', async () => {
    await expect(setup({ ...activeSession, selectedMembership: null }).service.resolve('user', 'session')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('supports a personal customer context with global roles only', async () => {
    const personal = { ...activeSession, selectedMembership: null, selectedMembershipId: null, selectedOrganizationId: null, selectedBranchId: null, selectedBranch: null };
    const { service, roleFindMany } = setup(personal, [{ organizationId: null, branchId: null, role: { key: 'CUSTOMER', permissions: [{ permission: { key: 'profile.read.own' } }] } }]);
    const result = await service.resolve('user', 'session');
    expect(result.workspaceType).toBe('PERSONAL'); expect(result.roles).toEqual(['CUSTOMER']);
    expect(roleFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null, role: { isActive: true } }) }));
  });
  it('asks Prisma to exclude revoked, expired, and inactive assignments', async () => {
    const { service, roleFindMany } = setup(); await service.resolve('user', 'session');
    expect(roleFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null, validFrom: expect.any(Object), role: { isActive: true }, AND: expect.any(Array) }) }));
  });
});
