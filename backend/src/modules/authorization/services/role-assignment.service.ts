import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BranchStatus, MembershipStatus, OrganizationType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthAuditService } from '../../auth/services/audit.service';
import type { AuthorizationContext } from '../types/authorization-context';
import { StepUpPolicyService } from './step-up-policy.service';

const ROLE_LEVEL: Record<string, number> = { CUSTOMER: 1, VIP_CUSTOMER: 1, AGENT: 2, RIDER: 2, PARTNER_USER: 2, OFFICE_STAFF: 3, BRANCH_MANAGER: 4, PARTNER_ADMIN: 4, ADMIN: 5, OWNER: 6, SUPER_ADMIN: 7 };
const PARTNER_DELEGABLE = new Set(['PARTNER_USER', 'PARTNER_ADMIN']);
const SENSITIVE = new Set(['PARTNER_ADMIN', 'ADMIN', 'OWNER']);

@Injectable()
export class RoleAssignmentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuthAuditService, private readonly stepUp: StepUpPolicyService) {}

  listRoles(context: AuthorizationContext) {
    return this.prisma.role.findMany({ where: { isActive: true, OR: [{ organizationId: null }, ...(context.organizationId ? [{ organizationId: context.organizationId }] : [])] }, select: { id: true, key: true, name: true, description: true, scope: true, systemManaged: true }, orderBy: { key: 'asc' } });
  }
  listPermissions() { return this.prisma.permission.findMany({ select: { id: true, key: true, description: true, riskLevel: true, requiresStepUp: true }, orderBy: { key: 'asc' } }); }
  async rolePermissions(roleId: string, context: AuthorizationContext) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, isActive: true, OR: [{ organizationId: null }, ...(context.organizationId ? [{ organizationId: context.organizationId }] : [])] }, select: { id: true, key: true, permissions: { select: { permission: { select: { id: true, key: true, description: true, riskLevel: true, requiresStepUp: true } } } } } });
    if (!role) throw this.notFound();
    return { id: role.id, key: role.key, permissions: role.permissions.map((item) => item.permission) };
  }
  async userRoles(targetUserId: string, context: AuthorizationContext) {
    if (!context.organizationId) throw this.denied();
    const member = await this.activeMembership(targetUserId, context.organizationId);
    if (!member) throw this.notFound();
    return this.prisma.userRole.findMany({ where: { userId: targetUserId, organizationId: context.organizationId, revokedAt: null }, select: { id: true, organizationId: true, branchId: true, validFrom: true, validUntil: true, role: { select: { id: true, key: true, name: true } } }, orderBy: { createdAt: 'asc' } });
  }

  async assign(targetUserId: string, roleId: string, branchId: string | undefined, reason: string | undefined, context: AuthorizationContext, requestId: string) {
    if (!context.organizationId || !context.membershipId) throw this.denied();
    const [role, targetMembership, organization] = await Promise.all([
      this.prisma.role.findFirst({ where: { id: roleId, isActive: true, OR: [{ organizationId: null }, { organizationId: context.organizationId }] } }),
      this.activeMembership(targetUserId, context.organizationId),
      this.prisma.organization.findUnique({ where: { id: context.organizationId }, select: { type: true } }),
    ]);
    if (!role || !targetMembership || !organization) throw this.notFound();
    if (role.key === 'SUPER_ADMIN') return this.escalation(context, requestId);
    if (organization.type === OrganizationType.PARTNER && (!PARTNER_DELEGABLE.has(role.key) || !context.roles.includes('PARTNER_ADMIN'))) return this.escalation(context, requestId);
    const actorLevel = Math.max(0, ...context.roles.map((key) => ROLE_LEVEL[key] ?? 0));
    if ((ROLE_LEVEL[role.key] ?? Number.MAX_SAFE_INTEGER) > actorLevel) return this.escalation(context, requestId);
    if (branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId: context.organizationId, status: BranchStatus.ACTIVE, deletedAt: null } });
      if (!branch || (context.branchId && context.branchId !== branchId)) throw this.denied();
    }
    if (SENSITIVE.has(role.key) && !this.stepUp.satisfies(context, { maxAgeSeconds: 600, requireMfa: true, minimumStrength: 2 })) {
      await this.audit.record('STEP_UP_AUTHENTICATION_REQUIRED', 'DENIED', requestId, context.userId, context.sessionId, { action: 'ROLE_ASSIGN', roleKey: role.key });
      throw new ForbiddenException({ code: 'AUTH_STEP_UP_REQUIRED', message: 'Additional authentication is required.', details: { methods: ['MFA', 'RECENT_LOGIN'] } });
    }
    const existing = await this.prisma.userRole.findFirst({ where: { userId: targetUserId, roleId, organizationId: context.organizationId, branchId: branchId ?? null, revokedAt: null } });
    if (existing) throw new ConflictException({ code: 'ROLE_ASSIGNMENT_EXISTS', message: 'The role is already assigned.', details: null });
    const assignment = await this.prisma.userRole.create({ data: { userId: targetUserId, roleId, organizationId: context.organizationId, branchId, grantedById: context.userId, reason }, select: { id: true, userId: true, organizationId: true, branchId: true, validFrom: true, role: { select: { id: true, key: true } } } });
    await this.audit.record('ROLE_ASSIGNED', 'SUCCESS', requestId, context.userId, context.sessionId, { targetUserId, userRoleId: assignment.id, roleKey: role.key, organizationId: context.organizationId, branchId: branchId ?? null });
    return assignment;
  }

  async revoke(targetUserId: string, userRoleId: string, context: AuthorizationContext, requestId: string) {
    if (!context.organizationId) throw this.denied();
    const assignment = await this.prisma.userRole.findFirst({ where: { id: userRoleId, userId: targetUserId, organizationId: context.organizationId, revokedAt: null }, include: { role: true } });
    if (!assignment) throw this.notFound();
    if (assignment.role.key === 'SUPER_ADMIN') return this.escalation(context, requestId);
    if (SENSITIVE.has(assignment.role.key) && !this.stepUp.satisfies(context, { maxAgeSeconds: 600, requireMfa: true, minimumStrength: 2 })) throw new ForbiddenException({ code: 'AUTH_STEP_UP_REQUIRED', message: 'Additional authentication is required.', details: { methods: ['MFA', 'RECENT_LOGIN'] } });
    if (assignment.role.key === 'OWNER') {
      const owners = await this.prisma.userRole.count({ where: { organizationId: context.organizationId, role: { key: 'OWNER', isActive: true }, revokedAt: null } });
      if (owners <= 1) throw new ConflictException({ code: 'FINAL_OWNER_REQUIRED', message: 'The final organization owner cannot be removed.', details: null });
    }
    await this.prisma.userRole.update({ where: { id: assignment.id }, data: { revokedAt: new Date() } });
    await this.audit.record('ROLE_REVOKED', 'SUCCESS', requestId, context.userId, context.sessionId, { targetUserId, userRoleId, roleKey: assignment.role.key, organizationId: context.organizationId });
    return { revoked: true };
  }

  private activeMembership(userId: string, organizationId: string) { const now = new Date(); return this.prisma.organizationMembership.findFirst({ where: { userId, organizationId, status: MembershipStatus.ACTIVE, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] } }); }
  private async escalation(context: AuthorizationContext, requestId: string): Promise<never> { await this.audit.record('PRIVILEGE_ESCALATION_ATTEMPT', 'DENIED', requestId, context.userId, context.sessionId, { organizationId: context.organizationId }); throw this.denied(); }
  private denied(): ForbiddenException { return new ForbiddenException({ code: 'AUTH_ROLE_DELEGATION_DENIED', message: 'You are not authorized to perform this action.', details: null }); }
  private notFound(): NotFoundException { return new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.', details: null }); }
}
