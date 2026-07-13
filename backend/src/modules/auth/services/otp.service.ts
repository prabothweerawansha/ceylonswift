import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaService } from '../../../database/prisma.service';
import { AuthAuditService } from './audit.service';
import { AuthRateLimitService } from './rate-limit.service';
import { DisabledOtpProvider, OtpProvider } from './otp-provider';
import { normalizeIdentifier, sha256 } from '../utils/security.util';

@Injectable()
export class OtpService {
  private readonly provider: OtpProvider = new DisabledOtpProvider();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly limits: AuthRateLimitService, private readonly audit: AuthAuditService) {}

  async request(identifier: string, channel: 'EMAIL' | 'SMS', purpose: string, requestId: string): Promise<{ accepted: true; challengeId: string; expiresIn: number; resendAfter: number }> {
    const normalized = normalizeIdentifier(identifier);
    const identity = normalized.email ?? normalized.phone ?? normalized.employeeId ?? 'invalid';
    const identityHash = sha256(identity);
    this.limits.consume(`otp:${identityHash}`, 5, 15 * 60_000);
    const ttl = this.config.get<number>('otp.ttlSeconds', 300);
    const resend = this.config.get<number>('otp.resendSeconds', 60);
    const maxAttempts = this.config.get<number>('otp.maxAttempts', 5);
    const recent = await this.prisma.otpChallenge.findFirst({
      where: { destinationHash: identityHash, purpose, resendAvailableAt: { gt: new Date() }, consumedAt: null, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) throw new HttpException({ code: 'AUTH_RATE_LIMITED', message: 'Unable to complete authentication.', details: null }, HttpStatus.TOO_MANY_REQUESTS);
    const user = await this.prisma.user.findFirst({ where: { OR: [normalized.email ? { normalizedEmail: normalized.email } : {}, normalized.phone ? { normalizedPhone: normalized.phone } : {}, normalized.employeeId ? { employeeProfile: { is: { employeeNumber: normalized.employeeId } } } : {}].filter((item) => Object.keys(item).length > 0) } });
    const code = randomInt(100000, 1000000).toString();
    const challenge = await this.prisma.otpChallenge.create({ data: { userId: user?.id, purpose, channel, destinationHash: identityHash, codeHash: await argon2.hash(code, { type: argon2.argon2id }), maxAttempts, expiresAt: new Date(Date.now() + ttl * 1000), resendAvailableAt: new Date(Date.now() + resend * 1000) } });
    if (user && this.provider.available) await this.provider.send({ destination: identity, channel, purpose, code });
    await this.audit.record('OTP_REQUESTED', 'ACCEPTED', requestId, user?.id, undefined, { channel, purpose });
    return { accepted: true, challengeId: challenge.id, expiresIn: ttl, resendAfter: resend };
  }

  async verify(challengeId: string, code: string, requestId: string): Promise<{ verified: true }> {
    this.limits.consume(`otp-verify:${sha256(challengeId)}`, 10, 15 * 60_000);
    const challenge = await this.prisma.otpChallenge.findUnique({ where: { id: challengeId } });
    const invalid = !challenge || challenge.consumedAt || challenge.revokedAt || challenge.expiresAt <= new Date() || challenge.attempts >= challenge.maxAttempts;
    if (invalid) throw this.invalid();
    const valid = await argon2.verify(challenge.codeHash, code).catch(() => false);
    if (!valid) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 }, ...(challenge.attempts + 1 >= challenge.maxAttempts ? { revokedAt: new Date() } : {}) } });
      await this.audit.record('OTP_VERIFICATION_FAILED', 'DENIED', requestId, challenge.userId ?? undefined);
      throw this.invalid();
    }
    await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    await this.audit.record('OTP_VERIFICATION_SUCCEEDED', 'SUCCESS', requestId, challenge.userId ?? undefined);
    return { verified: true };
  }

  private invalid(): UnauthorizedException { return new UnauthorizedException({ code: 'AUTH_OTP_INVALID', message: 'Unable to complete verification.', details: null }); }
}
