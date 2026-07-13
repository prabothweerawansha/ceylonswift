import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, EmployeeStatus, SessionStatus, type DeviceType, type User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { AccessTokenService } from './access-token.service';
import { PasswordService } from './password.service';
import { AuthAuditService } from './audit.service';
import { AuthRateLimitService } from './rate-limit.service';
import { durationToSeconds, normalizeIdentifier, opaqueToken, sha256 } from '../utils/security.util';

interface RequestContext { requestId: string; userAgent?: string; ipHash?: string }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly tokens: AccessTokenService, private readonly config: ConfigService, private readonly audit: AuthAuditService, private readonly limits: AuthRateLimitService) {}

  async login(identifier: string, password: string, clientType: DeviceType, deviceName: string | undefined, context: RequestContext) {
    const normalized = normalizeIdentifier(identifier); const identityHash = sha256(normalized.email ?? normalized.phone ?? normalized.employeeId ?? 'invalid');
    this.limits.consume(`login:${identityHash}`, 8, 15 * 60_000);
    const user = await this.findUser(normalized);
    const allowed = user?.accountStatus === AccountStatus.ACTIVE && (!user.employeeProfile || user.employeeProfile.employeeStatus === EmployeeStatus.ACTIVE);
    const passwordValid = user?.passwordHash ? await this.passwords.verify(user.passwordHash, password) : false;
    await this.prisma.loginAttempt.create({ data: { userId: user?.id, identityHash, successful: Boolean(allowed && passwordValid), failureCode: allowed && passwordValid ? null : 'AUTH_INVALID_CREDENTIALS', ipAddressHash: context.ipHash, requestId: context.requestId } });
    if (!user || !allowed || !passwordValid) { await this.audit.record('LOGIN_FAILED', 'DENIED', context.requestId, user?.id); throw this.invalidCredentials(); }

    const refreshTtl = durationToSeconds(this.config.get<string>('tokens.refreshTtl', '30d'), 2_592_000);
    const refreshToken = opaqueToken(); const tokenHash = sha256(refreshToken); const familyId = randomUUID();
    const session = await this.prisma.$transaction(async (tx) => {
      const device = await tx.userDevice.create({ data: { userId: user.id, deviceType: clientType, displayName: deviceName, platform: clientType, lastSeenAt: new Date() } });
      const created = await tx.session.create({ data: { userId: user.id, deviceId: device.id, status: SessionStatus.ACTIVE, userAgentSummary: context.userAgent?.slice(0, 512), ipAddressHash: context.ipHash, expiresAt: new Date(Date.now() + refreshTtl * 1000) } });
      await tx.refreshToken.create({ data: { sessionId: created.id, tokenHash, familyId, sequence: 1, expiresAt: created.expiresAt } });
      return created;
    });
    await this.audit.record('LOGIN_SUCCEEDED', 'SUCCESS', context.requestId, user.id, session.id);
    const access = this.tokens.issue(user.id, session.id);
    return { accessToken: access.token, expiresIn: access.expiresIn, refreshToken, user: this.safeUser(user), session: this.safeSession(session) };
  }

  async refresh(rawToken: string | undefined, context: RequestContext) {
    if (!rawToken) throw this.invalidRefresh();
    const hash = sha256(rawToken);
    this.limits.consume(`refresh:${hash}`, 12, 5 * 60_000);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash }, include: { session: { include: { user: { include: { profile: true } } } } } });
    if (!existing) throw this.invalidRefresh();
    const now = new Date();
    if (existing.consumedAt || existing.revokedAt || existing.expiresAt <= now || existing.session.status !== SessionStatus.ACTIVE || existing.session.revokedAt || existing.session.expiresAt <= now || existing.session.user.accountStatus !== AccountStatus.ACTIVE) {
      await this.revokeSession(existing.sessionId, 'REFRESH_TOKEN_REUSE');
      await this.audit.record('REFRESH_TOKEN_REUSE_DETECTED', 'DENIED', context.requestId, existing.session.userId, existing.sessionId);
      throw this.invalidRefresh();
    }
    const nextRaw = opaqueToken(); const nextHash = sha256(nextRaw);
    const rotated = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({ where: { id: existing.id, consumedAt: null, revokedAt: null }, data: { consumedAt: now } });
      if (consumed.count !== 1) return null;
      const next = await tx.refreshToken.create({ data: { sessionId: existing.sessionId, tokenHash: nextHash, familyId: existing.familyId, sequence: existing.sequence + 1, expiresAt: existing.expiresAt } });
      await tx.refreshToken.update({ where: { id: existing.id }, data: { replacedById: next.id } });
      await tx.session.update({ where: { id: existing.sessionId }, data: { lastSeenAt: now } });
      return next;
    });
    if (!rotated) { await this.revokeSession(existing.sessionId, 'CONCURRENT_REFRESH_REUSE'); throw this.invalidRefresh(); }
    await this.audit.record('SESSION_REFRESHED', 'SUCCESS', context.requestId, existing.session.userId, existing.sessionId);
    const access = this.tokens.issue(existing.session.userId, existing.sessionId);
    return { accessToken: access.token, expiresIn: access.expiresIn, refreshToken: nextRaw, user: this.safeUser(existing.session.user), session: this.safeSession(existing.session) };
  }

  async current(userId: string, sessionId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!user || !session) throw this.invalidRefresh();
    return { user: this.safeUser(user), session: this.safeSession(session) };
  }

  async logoutByRefresh(rawToken: string | undefined, requestId: string): Promise<void> {
    if (!rawToken) return;
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
    if (!token) return;
    await this.revokeSession(token.sessionId, 'LOGOUT');
    await this.audit.record('LOGOUT', 'SUCCESS', requestId, undefined, token.sessionId);
  }

  async logoutAll(userId: string, requestId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({ where: { userId, status: SessionStatus.ACTIVE }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, status: SessionStatus.ACTIVE }, data: { status: SessionStatus.REVOKED, revokedAt: new Date(), revocationReason: 'LOGOUT_ALL' } }),
      this.prisma.refreshToken.updateMany({ where: { sessionId: { in: sessions.map((item) => item.id) }, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.record('LOGOUT_ALL', 'SUCCESS', requestId, userId);
  }

  async validatePrincipal(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId, status: SessionStatus.ACTIVE, revokedAt: null, expiresAt: { gt: new Date() }, user: { accountStatus: AccountStatus.ACTIVE } } });
    return Boolean(session);
  }

  private async revokeSession(sessionId: string, reason: string): Promise<void> { const now = new Date(); await this.prisma.$transaction([this.prisma.session.updateMany({ where: { id: sessionId }, data: { status: SessionStatus.REVOKED, revokedAt: now, revocationReason: reason } }), this.prisma.refreshToken.updateMany({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } })]); }
  private async findUser(normalized: ReturnType<typeof normalizeIdentifier>) { const clauses = [normalized.email ? { normalizedEmail: normalized.email } : null, normalized.phone ? { normalizedPhone: normalized.phone } : null, normalized.employeeId ? { employeeProfile: { is: { employeeNumber: normalized.employeeId } } } : null].filter((item): item is NonNullable<typeof item> => Boolean(item)); return clauses.length ? this.prisma.user.findFirst({ where: { OR: clauses }, include: { profile: true, employeeProfile: true } }) : null; }
  private safeUser(user: User & { profile?: { displayName: string; preferredLanguage: string } | null }) { return { id: user.id, normalizedEmail: user.normalizedEmail, normalizedPhone: user.normalizedPhone, accountStatus: user.accountStatus, profile: user.profile ? { displayName: user.profile.displayName, preferredLanguage: user.profile.preferredLanguage } : null }; }
  private safeSession(session: { id: string; status: SessionStatus; issuedAt: Date; expiresAt: Date; deviceId: string | null; authenticationStrength: number; selectedMembershipId?: string | null; selectedOrganizationId?: string | null; selectedBranchId?: string | null }) { return { id: session.id, status: session.status, issuedAt: session.issuedAt, expiresAt: session.expiresAt, deviceId: session.deviceId, authenticationStrength: session.authenticationStrength, workspace: { membershipId: session.selectedMembershipId ?? null, organizationId: session.selectedOrganizationId ?? null, branchId: session.selectedBranchId ?? null } }; }
  private invalidCredentials(): UnauthorizedException { return new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Unable to complete authentication.', details: null }); }
  private invalidRefresh(): UnauthorizedException { return new UnauthorizedException({ code: 'AUTH_SESSION_INVALID', message: 'Authentication is required.', details: null }); }
}
