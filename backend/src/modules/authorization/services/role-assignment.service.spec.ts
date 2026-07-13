import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthAuditService } from '../../auth/services/audit.service';
import type { AuthorizationContext } from '../types/authorization-context';
import type { StepUpPolicyService } from './step-up-policy.service';
import { RoleAssignmentService } from './role-assignment.service';

describe('RoleAssignmentService', () => {
  const context = (roles = ['PARTNER_ADMIN']): AuthorizationContext => ({ userId: 'actor', sessionId: 'session', workspaceType: 'ORGANIZATION', membershipId: 'actor-membership', organizationId: 'org-a', branchId: 'branch-a', roles, permissions: new Set(['role.assign', 'role.revoke']), authenticationStrength: 2, recentAuthenticationAt: new Date(), mfaCompletedAt: new Date() });
  const setup = (roleKey = 'PARTNER_USER', organizationType: OrganizationType = OrganizationType.PARTNER) => {
    const mocks = { roleFindFirst: jest.fn().mockResolvedValue({ id: 'role', key: roleKey, isActive: true }), membershipFindFirst: jest.fn().mockResolvedValue({ id: 'target-membership' }), organizationFindUnique: jest.fn().mockResolvedValue({ type: organizationType }), branchFindFirst: jest.fn().mockResolvedValue({ id: 'branch-a' }), assignmentFindFirst: jest.fn().mockResolvedValue(null), assignmentCreate: jest.fn().mockResolvedValue({ id: 'assignment', role: { id: 'role', key: roleKey } }), assignmentCount: jest.fn().mockResolvedValue(2), assignmentUpdate: jest.fn().mockResolvedValue({}), audit: jest.fn().mockResolvedValue(undefined), satisfies: jest.fn().mockReturnValue(true) };
    const prisma = { role: { findFirst: mocks.roleFindFirst }, organizationMembership: { findFirst: mocks.membershipFindFirst }, organization: { findUnique: mocks.organizationFindUnique }, branch: { findFirst: mocks.branchFindFirst }, userRole: { findFirst: mocks.assignmentFindFirst, create: mocks.assignmentCreate, count: mocks.assignmentCount, update: mocks.assignmentUpdate } } as unknown as PrismaService;
    return { service: new RoleAssignmentService(prisma, { record: mocks.audit } as unknown as AuthAuditService, { satisfies: mocks.satisfies } as unknown as StepUpPolicyService), mocks };
  };
  it('allows an approved partner-scoped role assignment and audits it', async () => {
    const { service, mocks } = setup(); const result = await service.assign('target', 'role', 'branch-a', undefined, context(), 'request');
    expect(result).toMatchObject({ id: 'assignment' }); expect(mocks.assignmentCreate).toHaveBeenCalled(); expect(mocks.audit).toHaveBeenCalledWith('ROLE_ASSIGNED', 'SUCCESS', 'request', 'actor', 'session', expect.objectContaining({ targetUserId: 'target' }));
  });
  it('prevents PARTNER_ADMIN from assigning internal ADMIN', async () => {
    const { service, mocks } = setup('ADMIN'); await expect(service.assign('target', 'role', 'branch-a', undefined, context(), 'request')).rejects.toBeInstanceOf(ForbiddenException); expect(mocks.assignmentCreate).not.toHaveBeenCalled();
  });
  it('prevents ADMIN from assigning SUPER_ADMIN', async () => {
    const { service } = setup('SUPER_ADMIN', OrganizationType.DELIVERY_COMPANY); await expect(service.assign('target', 'role', 'branch-a', undefined, context(['ADMIN']), 'request')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects duplicate assignments', async () => {
    const { service, mocks } = setup(); mocks.assignmentFindFirst.mockResolvedValue({ id: 'existing' }); await expect(service.assign('target', 'role', 'branch-a', undefined, context(), 'request')).rejects.toBeInstanceOf(ConflictException);
  });
  it('protects the final organization owner from revocation', async () => {
    const { service, mocks } = setup('OWNER', OrganizationType.DELIVERY_COMPANY); mocks.assignmentFindFirst.mockResolvedValue({ id: 'assignment', role: { key: 'OWNER' } }); mocks.assignmentCount.mockResolvedValue(1);
    await expect(service.revoke('target', 'assignment', context(['OWNER']), 'request')).rejects.toBeInstanceOf(ConflictException); expect(mocks.assignmentUpdate).not.toHaveBeenCalled();
  });
});
