import argon2 from 'argon2';
import { AccountStatus, AddressType, EmployeeStatus, MembershipStatus, OrganizationStatus, OrganizationType, PackageStatus, PaymentMode, PrismaClient, RiderStatus, TrackingEventType, TrackingVisibility } from '@prisma/client';
import { assertDevelopmentProvisioning } from '../src/modules/authorization/provisioning/provisioning-policy';

const prisma = new PrismaClient();
const definitions = [
  ['CUSTOMER', 'customer.dev@example.test'], ['RIDER', 'rider.dev@example.test'], ['OFFICE_STAFF', 'office.dev@example.test'],
  ['BRANCH_MANAGER', 'manager.dev@example.test'], ['ADMIN', 'admin.dev@example.test'], ['PARTNER_USER', 'partner.user.dev@example.test'], ['PARTNER_ADMIN', 'partner.admin.dev@example.test'],
] as const;

async function main(): Promise<void> {
  assertDevelopmentProvisioning(process.env, 'PROVISION_DEV_USERS');
  const passwordHash = await argon2.hash(`${process.env.PROVISION_PASSWORD!}\u0000${process.env.PASSWORD_PEPPER!}`, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
  const internal = await prisma.organization.findUnique({ where: { slug: 'ceylonswift-development' } });
  if (!internal) throw new Error('Development organization is unavailable.');
  const branch = await prisma.branch.findFirst({ where: { organizationId: internal.id } });
  if (!branch) throw new Error('Development branch is unavailable.');
  const partner = await prisma.organization.upsert({ where: { slug: 'ceylonswift-partner-development' }, update: { status: OrganizationStatus.ACTIVE }, create: { name: 'CeylonSwift Partner Development', slug: 'ceylonswift-partner-development', type: OrganizationType.PARTNER, status: OrganizationStatus.ACTIVE } });
  const partnerBranch = await prisma.branch.upsert({ where: { organizationId_code: { organizationId: partner.id, code: 'PARTNER-DEV' } }, update: {}, create: { organizationId: partner.id, code: 'PARTNER-DEV', name: 'Partner Development Branch' } });
  for (const [roleKey, email] of definitions) {
    const role = await prisma.role.findFirst({ where: { key: roleKey, organizationId: null, isActive: true } }); if (!role) throw new Error(`Role ${roleKey} is unavailable.`);
    const user = await prisma.user.upsert({ where: { normalizedEmail: email }, update: {}, create: { normalizedEmail: email, passwordHash, accountStatus: AccountStatus.ACTIVE, emailVerifiedAt: new Date(), profile: { create: { displayName: `Development ${roleKey}` } }, ...(roleKey === 'RIDER' || ['OFFICE_STAFF', 'BRANCH_MANAGER', 'ADMIN'].includes(roleKey) ? { employeeProfile: { create: { employeeNumber: `DEV-${roleKey}`, jobTitle: 'Development Test User', employeeStatus: EmployeeStatus.ACTIVE, primaryBranchId: branch.id } } } : {}) } });
    if (roleKey === 'RIDER') await prisma.riderProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, riderStatus: RiderStatus.AVAILABLE, vehicleType: 'Development vehicle', licenseReference: 'DEVELOPMENT-METADATA-ONLY' } });
    const personal = roleKey === 'CUSTOMER'; const organization = roleKey.startsWith('PARTNER_') ? partner : internal; const defaultBranch = roleKey.startsWith('PARTNER_') ? partnerBranch : branch;
    if (!personal) await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: organization.id } }, update: { status: MembershipStatus.ACTIVE, defaultBranchId: defaultBranch.id }, create: { userId: user.id, organizationId: organization.id, defaultBranchId: defaultBranch.id, status: MembershipStatus.ACTIVE, startsAt: new Date() } });
    const existing = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id, organizationId: personal ? null : organization.id, branchId: personal ? null : defaultBranch.id, revokedAt: null } });
    if (!existing) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, organizationId: personal ? undefined : organization.id, branchId: personal ? undefined : defaultBranch.id, reason: 'Explicit development provisioning' } });
  }
  const branches = await prisma.branch.findMany({ where: { organizationId: internal.id }, orderBy: { code: 'asc' }, take: 2 });
  if (branches.length < 2) throw new Error('At least two development branches are required for rider fixtures.');
  const riderRole = await prisma.role.findFirstOrThrow({ where: { key: 'RIDER', organizationId: null, isActive: true } });
  const riderFixtures = [
    { email: 'rider.active.two.dev@example.test', employeeNumber: 'DEV-RIDER-02', name: 'Development Active Rider Two', branchId: branches[0]!.id, status: RiderStatus.AVAILABLE },
    { email: 'rider.active.three.dev@example.test', employeeNumber: 'DEV-RIDER-03', name: 'Development Active Rider Three', branchId: branches[0]!.id, status: RiderStatus.AVAILABLE },
    { email: 'rider.suspended.dev@example.test', employeeNumber: 'DEV-RIDER-SUSPENDED', name: 'Development Suspended Rider', branchId: branches[0]!.id, status: RiderStatus.SUSPENDED },
    { email: 'rider.other.branch.dev@example.test', employeeNumber: 'DEV-RIDER-OTHER-BRANCH', name: 'Development Other Branch Rider', branchId: branches[1]!.id, status: RiderStatus.AVAILABLE },
  ];
  for (const fixture of riderFixtures) {
    const user = await prisma.user.upsert({ where: { normalizedEmail: fixture.email }, update: { accountStatus: AccountStatus.ACTIVE }, create: { normalizedEmail: fixture.email, passwordHash, accountStatus: AccountStatus.ACTIVE, emailVerifiedAt: new Date(), profile: { create: { displayName: fixture.name } } } });
    await prisma.employeeProfile.upsert({ where: { userId: user.id }, update: { employeeStatus: fixture.status === RiderStatus.SUSPENDED ? EmployeeStatus.SUSPENDED : EmployeeStatus.ACTIVE, primaryBranchId: fixture.branchId }, create: { userId: user.id, employeeNumber: fixture.employeeNumber, jobTitle: 'Development Rider Fixture', employeeStatus: fixture.status === RiderStatus.SUSPENDED ? EmployeeStatus.SUSPENDED : EmployeeStatus.ACTIVE, primaryBranchId: fixture.branchId } });
    await prisma.riderProfile.upsert({ where: { userId: user.id }, update: { riderStatus: fixture.status }, create: { userId: user.id, riderStatus: fixture.status, vehicleType: 'Development vehicle', licenseReference: 'DEVELOPMENT-METADATA-ONLY' } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: internal.id } }, update: { status: MembershipStatus.ACTIVE, defaultBranchId: fixture.branchId }, create: { userId: user.id, organizationId: internal.id, defaultBranchId: fixture.branchId, status: MembershipStatus.ACTIVE, startsAt: new Date() } });
    if (!(await prisma.userRole.findFirst({ where: { userId: user.id, roleId: riderRole.id, organizationId: internal.id, branchId: fixture.branchId, revokedAt: null } }))) await prisma.userRole.create({ data: { userId: user.id, roleId: riderRole.id, organizationId: internal.id, branchId: fixture.branchId, reason: 'Development multi-rider acceptance fixture' } });
  }
  const hubs = await prisma.hub.findMany({ where: { organizationId: internal.id, branchId: { in: branches.map((item) => item.id) } }, orderBy: { code: 'asc' } });
  if (hubs.length < 2) throw new Error('Development hubs are required for package fixtures.');
  for (let index = 1; index <= 3; index += 1) {
    const legacyId = `PHASE8-ASSIGNABLE-${index}`;
    if (await prisma.package.findUnique({ where: { legacyId } })) continue;
    const origin = await prisma.address.create({ data: { organizationId: internal.id, type: AddressType.PICKUP, label: 'Development fixture origin', line1: 'Synthetic origin', locality: 'Development', countryCode: 'LK' } });
    const destination = await prisma.address.create({ data: { organizationId: internal.id, type: AddressType.DELIVERY, label: 'Development fixture destination', line1: 'Synthetic destination', locality: 'Development', countryCode: 'LK' } });
    const pkg = await prisma.package.create({ data: { organizationId: internal.id, originBranchId: hubs[0]!.branchId, destinationBranchId: hubs[1]!.branchId, originHubId: hubs[0]!.id, destinationHubId: hubs[1]!.id, originAddressId: origin.id, destinationAddressId: destination.id, trackingCode: `CSW-DEV-PHASE8-${String(index).padStart(2, '0')}`, legacyId, recipientName: 'Synthetic Acceptance Recipient', weightKg: 1, serviceLevel: 'EXPRESS', paymentMode: PaymentMode.PREPAID, quotedAmount: 250, status: PackageStatus.AWAITING_PICKUP } });
    await prisma.trackingEvent.create({ data: { packageId: pkg.id, type: TrackingEventType.CREATED, visibility: TrackingVisibility.INTERNAL, publicMessage: 'Development acceptance fixture created.', sequence: 1 } });
  }
  await prisma.auditLog.create({ data: { action: 'DEVELOPMENT_PROVISIONING_COMPLETED', outcome: 'SUCCESS', requestId: `provision-dev-users:${Date.now()}`, metadata: { userCount: definitions.length } } });
  console.log('Development user provisioning completed without displaying credentials.');
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Provisioning failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
