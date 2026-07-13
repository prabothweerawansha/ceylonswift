import argon2 from 'argon2';
import { AccountStatus, PrismaClient } from '@prisma/client';
import { assertDevelopmentProvisioning, normalizedProvisioningEmail } from '../src/modules/authorization/provisioning/provisioning-policy';

const prisma = new PrismaClient();
async function main(): Promise<void> {
  assertDevelopmentProvisioning(process.env, 'PROVISION_SUPER_ADMIN');
  const email = normalizedProvisioningEmail(process.env.PROVISION_EMAIL);
  if (await prisma.user.findUnique({ where: { normalizedEmail: email } })) throw new Error('The requested account already exists; automatic reuse is refused.');
  const role = await prisma.role.findFirst({ where: { key: 'SUPER_ADMIN', organizationId: null, systemManaged: true, isActive: true } });
  if (!role) throw new Error('Protected SUPER_ADMIN role is unavailable.');
  const passwordHash = await argon2.hash(`${process.env.PROVISION_PASSWORD!}\u0000${process.env.PASSWORD_PEPPER!}`, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { normalizedEmail: email, passwordHash, accountStatus: AccountStatus.ACTIVE, emailVerifiedAt: new Date(), profile: { create: { displayName: 'Development Super Admin' } } } });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id, reason: 'Explicit development provisioning' } });
    await tx.auditLog.create({ data: { action: 'SUPER_ADMIN_PROVISIONED', outcome: 'SUCCESS', actorId: user.id, requestId: `provision-super-admin:${user.id}`, metadata: { environment: process.env.NODE_ENV ?? 'development' } } });
  });
  console.log('Development SUPER_ADMIN provisioning completed without displaying credentials.');
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Provisioning failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
