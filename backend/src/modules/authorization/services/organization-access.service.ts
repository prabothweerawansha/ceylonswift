import { Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../types/authorization-context';

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string) {
    const now = new Date();
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }], organization: { status: OrganizationStatus.ACTIVE, deletedAt: null } },
      select: { id: true, defaultBranchId: true, organization: { select: { id: true, name: true, slug: true, type: true, status: true, countryCode: true, timezone: true } } },
      orderBy: { organization: { name: 'asc' } },
    });
    return { organizations: memberships.map((item) => ({ membershipId: item.id, defaultBranchId: item.defaultBranchId, ...item.organization })) };
  }
  async get(organizationId: string, context: AuthorizationContext) {
    if (organizationId !== context.organizationId) throw this.notFound();
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId, status: OrganizationStatus.ACTIVE, deletedAt: null }, select: { id: true, name: true, slug: true, type: true, status: true, countryCode: true, timezone: true } });
    if (!organization) throw this.notFound(); return organization;
  }
  async memberships(organizationId: string, context: AuthorizationContext) {
    await this.get(organizationId, context);
    return this.prisma.organizationMembership.findMany({ where: { organizationId, status: { in: [MembershipStatus.ACTIVE, MembershipStatus.PENDING, MembershipStatus.INVITED] } }, select: { id: true, userId: true, defaultBranchId: true, status: true, startsAt: true, endsAt: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  }
  async branches(organizationId: string, context: AuthorizationContext) {
    await this.get(organizationId, context);
    return this.prisma.branch.findMany({ where: { organizationId, deletedAt: null, ...(context.branchId ? { id: context.branchId } : {}) }, select: { id: true, organizationId: true, parentBranchId: true, code: true, name: true, status: true, timezone: true }, orderBy: { code: 'asc' } });
  }
  private notFound(): NotFoundException { return new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.', details: null }); }
}
