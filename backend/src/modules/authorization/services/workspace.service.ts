import { ForbiddenException, Injectable } from '@nestjs/common';
import { BranchStatus, MembershipStatus, OrganizationStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AccessTokenService } from '../../auth/services/access-token.service';
import { AuthAuditService } from '../../auth/services/audit.service';
import { PermissionResolverService } from './permission-resolver.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService, private readonly tokens: AccessTokenService, private readonly audit: AuthAuditService, private readonly resolver: PermissionResolverService) {}

  async list(userId: string) {
    const now = new Date();
    const [memberships, personalRoles] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where: { userId, status: MembershipStatus.ACTIVE, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], organization: { status: OrganizationStatus.ACTIVE, deletedAt: null } },
        include: { organization: true, defaultBranch: true }, orderBy: { organization: { name: 'asc' } },
      }),
      this.prisma.userRole.findMany({ where: { userId, organizationId: null, branchId: null, revokedAt: null, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }], role: { isActive: true } }, include: { role: true } }),
    ]);
    const workspaces: Array<{ id: string; type: 'PERSONAL' | 'ORGANIZATION'; organizationId: string | null; branchId: string | null; displayName: string; roles: string[] }> = [];
    const personal = [...new Set(personalRoles.map((item) => item.role.key).filter((key) => key === 'CUSTOMER' || key === 'VIP_CUSTOMER' || key === 'SUPER_ADMIN'))];
    if (personal.length) workspaces.push({ id: `personal:${userId}`, type: 'PERSONAL', organizationId: null, branchId: null, displayName: 'Personal Account', roles: personal });
    for (const membership of memberships) {
      const roles = await this.rolesForMembership(userId, membership.organizationId, membership.defaultBranchId, now);
      if (roles.length) workspaces.push({ id: membership.id, type: 'ORGANIZATION', organizationId: membership.organizationId, branchId: membership.defaultBranch?.status === BranchStatus.ACTIVE ? membership.defaultBranchId : null, displayName: membership.organization.name, roles });
    }
    return { workspaces };
  }

  async select(userId: string, sessionId: string, workspaceId: string, requestId: string) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId, status: SessionStatus.ACTIVE, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!session) throw this.denied();
    if (workspaceId === `personal:${userId}`) {
      const globalRole = await this.prisma.userRole.findFirst({ where: { userId, organizationId: null, branchId: null, revokedAt: null, role: { isActive: true, key: { in: ['CUSTOMER', 'VIP_CUSTOMER', 'SUPER_ADMIN'] } } } });
      if (!globalRole) return this.selectionDenied(userId, sessionId, requestId);
      await this.prisma.session.update({ where: { id: sessionId }, data: { selectedMembershipId: null, selectedOrganizationId: null, selectedBranchId: null } });
    } else {
      const now = new Date();
      const membership = await this.prisma.organizationMembership.findFirst({ where: { id: workspaceId, userId, status: MembershipStatus.ACTIVE, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], organization: { status: OrganizationStatus.ACTIVE, deletedAt: null } }, include: { defaultBranch: true } });
      if (!membership || (membership.defaultBranch && (membership.defaultBranch.organizationId !== membership.organizationId || membership.defaultBranch.status !== BranchStatus.ACTIVE || membership.defaultBranch.deletedAt))) return this.selectionDenied(userId, sessionId, requestId);
      const roles = await this.rolesForMembership(userId, membership.organizationId, membership.defaultBranchId, now);
      if (!roles.length) return this.selectionDenied(userId, sessionId, requestId);
      await this.prisma.session.update({ where: { id: sessionId }, data: { selectedMembershipId: membership.id, selectedOrganizationId: membership.organizationId, selectedBranchId: membership.defaultBranchId } });
    }
    const authorization = await this.resolver.resolve(userId, sessionId);
    await this.audit.record('WORKSPACE_SELECTED', 'SUCCESS', requestId, userId, sessionId, { workspaceType: authorization.workspaceType, membershipId: authorization.membershipId, organizationId: authorization.organizationId, branchId: authorization.branchId });
    const access = this.tokens.issue(userId, sessionId);
    return { accessToken: access.token, expiresIn: access.expiresIn, workspace: this.safeContext(authorization) };
  }

  private async rolesForMembership(userId: string, organizationId: string, branchId: string | null, now: Date): Promise<string[]> {
    const assignments = await this.prisma.userRole.findMany({ where: { userId, organizationId, revokedAt: null, validFrom: { lte: now }, AND: [{ OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, { OR: branchId ? [{ branchId: null }, { branchId }] : [{ branchId: null }] }], role: { isActive: true } }, include: { role: true } });
    return [...new Set(assignments.map((item) => item.role.key))];
  }
  private safeContext(context: Awaited<ReturnType<PermissionResolverService['resolve']>>) { return { type: context.workspaceType, membershipId: context.membershipId, organizationId: context.organizationId, branchId: context.branchId, roles: context.roles }; }
  private async selectionDenied(userId: string, sessionId: string, requestId: string): Promise<never> { await this.audit.record('WORKSPACE_SELECTION_DENIED', 'DENIED', requestId, userId, sessionId); throw this.denied(); }
  private denied(): ForbiddenException { return new ForbiddenException({ code: 'AUTH_WORKSPACE_INVALID', message: 'The selected workspace is unavailable.', details: null }); }
}
