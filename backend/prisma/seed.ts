import {
  OrganizationStatus,
  OrganizationType,
  HubStatus,
  PricingRuleStatus,
  PrismaClient,
  RoleScope,
} from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  'profile.read.own', 'profile.update.own', 'package.create', 'package.read.own',
  'package.read.branch', 'package.read.organization', 'package.update', 'package.assign',
  'package.deliver', 'tracking.read.public', 'tracking.update', 'rider.approve',
  'rider.suspend', 'staff.invite', 'staff.approve', 'staff.suspend', 'hub.read',
  'hub.manage', 'pricing.read', 'pricing.manage', 'role.assign', 'role.revoke',
  'permission.manage', 'organization.manage', 'branch.manage', 'audit.read',
  'session.revoke.own', 'session.revoke.any', 'system.reset', 'owner.action.sensitive',
  'role.read', 'permission.read', 'organization.read', 'branch.read', 'staff.read', 'rider.read',
  'website_content.read', 'website_content.edit', 'website_content.submit',
  'website_content.approve', 'website_content.publish', 'website_content.rollback',
  'website_media.upload', 'website_media.approve', 'review.create', 'review.moderate',
  'feature_policy.read', 'feature_policy.manage',
] as const;

const highRiskPermissions = new Set([
  'staff.approve', 'staff.suspend', 'pricing.manage', 'role.assign', 'role.revoke',
  'permission.manage', 'organization.manage', 'session.revoke.any', 'system.reset',
  'owner.action.sensitive',
  'website_content.approve', 'website_content.publish', 'website_content.rollback',
  'website_media.approve', 'review.moderate',
  'feature_policy.manage',
]);

const rolePermissions: Record<string, readonly string[]> = {
  CUSTOMER: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.own', 'tracking.read.public', 'hub.read', 'pricing.read', 'review.create', 'session.revoke.own'],
  VIP_CUSTOMER: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.own', 'tracking.read.public', 'hub.read', 'pricing.read', 'review.create', 'session.revoke.own'],
  RIDER: ['profile.read.own', 'profile.update.own', 'package.read.own', 'package.deliver', 'tracking.read.public', 'tracking.update', 'hub.read', 'session.revoke.own'],
  AGENT: ['profile.read.own', 'profile.update.own', 'tracking.read.public', 'hub.read', 'pricing.read', 'session.revoke.own'],
  OFFICE_STAFF: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.branch', 'package.update', 'tracking.read.public', 'tracking.update', 'hub.read', 'pricing.read', 'organization.read', 'branch.read', 'website_content.read', 'website_content.edit', 'website_content.submit', 'feature_policy.read', 'session.revoke.own'],
  BRANCH_MANAGER: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.branch', 'package.update', 'package.assign', 'tracking.read.public', 'tracking.update', 'rider.read', 'rider.approve', 'rider.suspend', 'staff.read', 'staff.invite', 'hub.read', 'hub.manage', 'pricing.read', 'organization.read', 'branch.read', 'branch.manage', 'session.revoke.own'],
  ADMIN: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.branch', 'package.read.organization', 'package.update', 'package.assign', 'tracking.read.public', 'tracking.update', 'rider.read', 'rider.approve', 'rider.suspend', 'staff.read', 'staff.invite', 'staff.approve', 'staff.suspend', 'hub.read', 'hub.manage', 'pricing.read', 'pricing.manage', 'role.read', 'role.assign', 'role.revoke', 'permission.read', 'organization.read', 'branch.read', 'branch.manage', 'audit.read', 'website_content.read', 'website_content.edit', 'website_content.submit', 'website_content.approve', 'website_content.publish', 'website_content.rollback', 'website_media.upload', 'website_media.approve', 'review.moderate', 'feature_policy.read', 'feature_policy.manage', 'session.revoke.own', 'session.revoke.any'],
  OWNER: permissions.filter((permission) => permission !== 'system.reset'),
  SUPER_ADMIN: permissions,
  PARTNER_USER: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.own', 'tracking.read.public', 'hub.read', 'pricing.read', 'session.revoke.own'],
  PARTNER_ADMIN: ['profile.read.own', 'profile.update.own', 'package.create', 'package.read.branch', 'package.read.organization', 'package.update', 'package.assign', 'tracking.read.public', 'staff.read', 'staff.invite', 'staff.approve', 'staff.suspend', 'hub.read', 'pricing.read', 'pricing.manage', 'role.read', 'role.assign', 'role.revoke', 'permission.read', 'organization.read', 'branch.read', 'organization.manage', 'branch.manage', 'audit.read', 'session.revoke.own'],
};

async function upsertSystemRole(key: string): Promise<string> {
  const existing = await prisma.role.findFirst({ where: { key, organizationId: null } });
  if (existing) {
    const updated = await prisma.role.update({
      where: { id: existing.id },
      data: { name: key.replaceAll('_', ' '), scope: RoleScope.SYSTEM, systemManaged: true, isActive: true },
    });
    return updated.id;
  }
  const created = await prisma.role.create({
    data: { key, name: key.replaceAll('_', ' '), scope: RoleScope.SYSTEM, systemManaged: true, isActive: true },
  });
  return created.id;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed is disabled in production.');
  }

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {
        description: `Allows ${key}.`,
        riskLevel: highRiskPermissions.has(key) ? 3 : 1,
        requiresStepUp: highRiskPermissions.has(key),
      },
      create: {
        key,
        description: `Allows ${key}.`,
        riskLevel: highRiskPermissions.has(key) ? 3 : 1,
        requiresStepUp: highRiskPermissions.has(key),
      },
    });
  }

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissions)) {
    const roleId = await upsertSystemRole(roleKey);
    const assignedPermissions = await prisma.permission.findMany({ where: { key: { in: [...permissionKeys] } } });
    for (const permission of assignedPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
    }
  }

  const organization = await prisma.organization.upsert({
    where: { slug: 'ceylonswift-development' },
    update: { name: 'CeylonSwift Development', status: OrganizationStatus.ACTIVE },
    create: {
      name: 'CeylonSwift Development',
      slug: 'ceylonswift-development',
      type: OrganizationType.DELIVERY_COMPANY,
      status: OrganizationStatus.ACTIVE,
    },
  });

  const branchFixtures = [
    ['DEV-CMB', 'Development Colombo Branch', 'Colombo', 1500],
    ['DEV-KDY', 'Development Kandy Branch', 'Kandy', 800],
    ['DEV-GLE', 'Development Galle Branch', 'Galle', 600],
    ['DEV-JAF', 'Development Jaffna Branch', 'Jaffna', 500],
    ['DEV-GMP', 'Development Gampaha Branch', 'Gampaha', 1000],
    ['DEV-KUR', 'Development Kurunegala Branch', 'Kurunegala', 700],
  ] as const;

  for (const [code, name, district, capacity] of branchFixtures) {
    const branch = await prisma.branch.upsert({
      where: { organizationId_code: { organizationId: organization.id, code } },
      update: { name },
      create: { organizationId: organization.id, code, name },
    });
    await prisma.hub.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: `${code}-HUB` } },
      update: { name: `${district} Development Hub`, branchId: branch.id, status: HubStatus.ACTIVE, capacity, addressData: { district } },
      create: { organizationId: organization.id, branchId: branch.id, code: `${code}-HUB`, name: `${district} Development Hub`, status: HubStatus.ACTIVE, capacity, addressData: { district } },
    });
  }

  const pricingEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  for (const [key, serviceLevel, baseFee] of [['STANDARD', 'STANDARD', 200], ['EXPRESS', 'EXPRESS', 250], ['SAME_DAY', 'SAME_DAY', 400]] as const) {
    const existing = await prisma.pricingRule.findFirst({ where: { organizationId: organization.id, branchId: null, key, effectiveFrom: pricingEffectiveFrom } });
    const data = {
      serviceLevel,
      status: PricingRuleStatus.ACTIVE,
      priority: 100,
      currency: 'LKR',
      ruleDefinition: { baseFee, includedWeightKg: 1, perAdditionalKg: 80, minimumFee: baseFee, interBranchSurcharge: 150, codRate: 0.01, codMinimum: 50 },
      effectiveFrom: pricingEffectiveFrom,
      effectiveUntil: null,
    };
    if (existing) await prisma.pricingRule.update({ where: { id: existing.id }, data });
    else await prisma.pricingRule.create({ data: { organizationId: organization.id, branchId: null, key, ...data } });
  }

  console.log('Development roles, permissions, organization, branches, hubs, and pricing rules are ready. No users were created.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Seed failed.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
