import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, BranchStatus, MembershipStatus, OrganizationStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../types/authorization-context';

@Injectable()
export class PermissionResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string, sessionId: string): Promise<AuthorizationContext> {
    const now = new Date();
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, status: SessionStatus.ACTIVE, revokedAt: null, expiresAt: { gt: now }, user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null } },
      include: { selectedMembership: { include: { organization: true, defaultBranch: true } }, selectedBranch: true },
    });
    if (!session) throw this.unauthenticated();

    const membership = session.selectedMembership;
    if (!membership) {
      if (session.selectedOrganizationId || session.selectedBranchId) throw this.workspaceInvalid();
      const assignments = await this.assignments(userId, null, null, now);
      return this.context(session, 'PERSONAL', null, null, null, assignments);
    }

    const activeMembership = membership.userId === userId
      && membership.status === MembershipStatus.ACTIVE
      && (!membership.startsAt || membership.startsAt <= now)
      && (!membership.endsAt || membership.endsAt > now)
      && membership.organization.status === OrganizationStatus.ACTIVE
      && !membership.organization.deletedAt
      && session.selectedOrganizationId === membership.organizationId;
    if (!activeMembership) throw this.workspaceInvalid();

    const branchId = session.selectedBranchId;
    if (branchId && (!session.selectedBranch || session.selectedBranch.organizationId !== membership.organizationId || session.selectedBranch.status !== BranchStatus.ACTIVE || session.selectedBranch.deletedAt)) {
      throw this.workspaceInvalid();
    }
    const assignments = await this.assignments(userId, membership.organizationId, branchId, now);
    const hasOrganizationScope = assignments.some((assignment) => assignment.organizationId === membership.organizationId && assignment.branchId === null);
    const hasBranchScope = !branchId || membership.defaultBranchId === branchId || assignments.some((assignment) => assignment.branchId === branchId);
    if (!hasOrganizationScope && !hasBranchScope) throw this.workspaceInvalid();
    return this.context(session, 'ORGANIZATION', membership.id, membership.organizationId, branchId, assignments);
  }

  private assignments(userId: string, organizationId: string | null, branchId: string | null, now: Date) {
    return this.prisma.userRole.findMany({
      where: {
        userId, revokedAt: null, validFrom: { lte: now },
        AND: [
          { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
          organizationId === null
            ? { organizationId: null, branchId: null }
            : { organizationId, OR: branchId ? [{ branchId: null }, { branchId }] : [{ branchId: null }] },
        ],
        role: { isActive: true },
      },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
  }

  private context(
    session: { id: string; userId: string; authenticationStrength: number; recentAuthenticationAt: Date; mfaCompletedAt: Date | null },
    workspaceType: 'PERSONAL' | 'ORGANIZATION', membershipId: string | null, organizationId: string | null, branchId: string | null,
    assignments: Awaited<ReturnType<PermissionResolverService['assignments']>>,
  ): AuthorizationContext {
    const roles = [...new Set(assignments.map((item) => item.role.key))];
    const permissions = new Set(assignments.flatMap((item) => item.role.permissions.map((mapping) => mapping.permission.key)));
    return { userId: session.userId, sessionId: session.id, workspaceType, membershipId, organizationId, branchId, roles, permissions, authenticationStrength: session.authenticationStrength, recentAuthenticationAt: session.recentAuthenticationAt, mfaCompletedAt: session.mfaCompletedAt };
  }

  private unauthenticated(): UnauthorizedException { return new UnauthorizedException({ code: 'AUTH_SESSION_INVALID', message: 'Authentication is required.', details: null }); }
  private workspaceInvalid(): ForbiddenException { return new ForbiddenException({ code: 'AUTH_WORKSPACE_INVALID', message: 'The selected workspace is unavailable.', details: null }); }
}
