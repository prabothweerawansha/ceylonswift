import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobStatus, InvitationStatus, Prisma, SessionStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { safeFailureMessage } from '../../../common/security/redaction';
import { PrismaService } from '../../../database/prisma.service';
import { MetricsService } from './metrics.service';
import { withRetry } from './retry-policy';

type Tx = Prisma.TransactionClient;
type Job = { name: string; run: (tx: Tx, batch: number) => Promise<number> };

@Injectable()
export class MaintenanceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceJobsService.name);
  private timer?: NodeJS.Timeout;
  private stopping = false;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('jobs.enabled', false)) return;
    const interval = this.config.get<number>('jobs.intervalSeconds', 900) * 1000;
    this.timer = setInterval(() => void this.runAll(), interval);
    this.timer.unref();
  }

  onModuleDestroy(): void { this.stopping = true; if (this.timer) clearInterval(this.timer); }

  async runAll(): Promise<Array<{ job: string; status: string; processed: number }>> {
    if (this.stopping) return [];
    const results = [];
    for (const job of this.jobs()) results.push(await this.run(job));
    return results;
  }

  async recentRuns(limit = 50) {
    return this.prisma.backgroundJobRun.findMany({ orderBy: { startedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100), select: { id: true, jobName: true, status: true, attempt: true, processedCount: true, startedAt: true, completedAt: true, durationMs: true, failureCode: true } });
  }

  private jobs(): Job[] {
    return [
      { name: 'expired-idempotency', run: (tx, batch) => this.deleteBatch(tx, 'idempotencyRecord', { expiresAt: { lt: new Date() } }, batch, 'expiresAt') },
      { name: 'expired-refresh-tokens', run: (tx, batch) => this.deleteBatch(tx, 'refreshToken', { expiresAt: { lt: this.daysAgo(this.retention('sessionsDays')) } }, batch, 'expiresAt') },
      { name: 'expired-sessions', run: (tx, batch) => this.cleanupSessions(tx, batch) },
      { name: 'expired-otp-challenges', run: (tx, batch) => this.deleteBatch(tx, 'otpChallenge', { expiresAt: { lt: this.daysAgo(this.retention('challengesDays')) } }, batch, 'expiresAt') },
      { name: 'expired-oauth-challenges', run: (tx, batch) => this.deleteBatch(tx, 'oAuthChallenge', { expiresAt: { lt: this.daysAgo(this.retention('challengesDays')) } }, batch, 'expiresAt') },
      { name: 'expired-webauthn-challenges', run: (tx, batch) => this.deleteBatch(tx, 'webAuthnChallenge', { expiresAt: { lt: this.daysAgo(this.retention('challengesDays')) } }, batch, 'expiresAt') },
      { name: 'expired-invitations', run: (tx, batch) => this.cleanupInvitations(tx, batch) },
      { name: 'stale-login-attempts', run: (tx, batch) => this.deleteBatch(tx, 'loginAttempt', { attemptedAt: { lt: this.daysAgo(this.retention('loginAttemptsDays')) } }, batch, 'attemptedAt') },
      { name: 'audit-retention-review', run: (tx, batch) => this.auditRetentionReview(tx, batch) },
      { name: 'development-fixture-review', run: () => Promise.resolve(0) },
    ];
  }

  private async run(job: Job): Promise<{ job: string; status: string; processed: number }> {
    const lockKey = this.lockKey(job.name);
    const maxAttempts = this.config.get<number>('jobs.maxRetries', 3);
    const batch = this.config.get<number>('jobs.batchSize', 250);
    const started = Date.now();
    let runId: string | undefined;
    try {
      const result = await withRetry(async (attempt) => this.prisma.$transaction(async (tx) => {
        const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked`);
        if (!lock?.locked) return { skipped: true, processed: 0, attempt };
        const record = await tx.backgroundJobRun.create({ data: { jobName: job.name, lockKey, attempt } });
        runId = record.id;
        const processed = await job.run(tx, batch);
        const durationMs = Date.now() - started;
        await tx.backgroundJobRun.update({ where: { id: record.id }, data: { status: BackgroundJobStatus.SUCCEEDED, processedCount: processed, completedAt: new Date(), durationMs } });
        return { skipped: false, processed, attempt };
      }, { timeout: 30000 }), {
        maxAttempts, baseDelayMs: 100, maxDelayMs: 2000, isTransient: this.isTransient,
        onRetry: (attempt, delayMs) => this.logger.warn({ job: job.name, attempt, delayMs }, 'transient background job failure'),
      });
      const status = result.skipped ? 'SKIPPED' : 'SUCCEEDED';
      this.metrics.increment('background_job_runs_total', { job: job.name, outcome: status.toLowerCase() });
      return { job: job.name, status, processed: result.processed };
    } catch (error) {
      const message = safeFailureMessage(error);
      if (runId) await this.prisma.backgroundJobRun.updateMany({ where: { id: runId }, data: { status: BackgroundJobStatus.DEAD_LETTERED, failureCode: 'JOB_RETRIES_EXHAUSTED', failureMessage: message, completedAt: new Date(), durationMs: Date.now() - started } });
      await this.prisma.deadLetterJob.create({ data: { jobName: job.name, jobRunId: runId, failureCode: 'JOB_RETRIES_EXHAUSTED', failureMessage: message, attempts: maxAttempts, safeContext: { batchSize: batch } } });
      this.metrics.increment('background_job_runs_total', { job: job.name, outcome: 'dead_lettered' });
      return { job: job.name, status: 'DEAD_LETTERED', processed: 0 };
    }
  }

  private async cleanupSessions(tx: Tx, batch: number): Promise<number> {
    const now = new Date();
    await tx.session.updateMany({ where: { status: SessionStatus.ACTIVE, expiresAt: { lt: now } }, data: { status: SessionStatus.EXPIRED } });
    const ids = await tx.session.findMany({ where: { status: { in: [SessionStatus.EXPIRED, SessionStatus.REVOKED] }, expiresAt: { lt: this.daysAgo(this.retention('sessionsDays')) }, refreshTokens: { none: {} } }, select: { id: true }, orderBy: { expiresAt: 'asc' }, take: batch });
    if (!ids.length) return 0;
    return (await tx.session.deleteMany({ where: { id: { in: ids.map((row) => row.id) } } })).count;
  }

  private async cleanupInvitations(tx: Tx, batch: number): Promise<number> {
    await tx.invitation.updateMany({ where: { status: InvitationStatus.PENDING, expiresAt: { lt: new Date() } }, data: { status: InvitationStatus.EXPIRED } });
    return this.deleteBatch(tx, 'invitation', { status: { in: [InvitationStatus.EXPIRED, InvitationStatus.REVOKED] }, expiresAt: { lt: this.daysAgo(this.retention('invitationsDays')) } }, batch, 'expiresAt');
  }

  private async auditRetentionReview(tx: Tx, batch: number): Promise<number> {
    return tx.auditLog.count({ where: { occurredAt: { lt: this.daysAgo(this.retention('auditDays')) }, action: { notIn: ['REFRESH_TOKEN_REUSE_DETECTED', 'PRIVILEGE_ESCALATION_ATTEMPT', 'CROSS_TENANT_ACCESS_ATTEMPTED'] } }, take: batch });
  }

  private async deleteBatch(tx: Tx, model: string, where: object, batch: number, orderField: string): Promise<number> {
    const delegate = (tx as unknown as Record<string, { findMany(args: object): Promise<Array<{ id: string }>>; deleteMany(args: object): Promise<{ count: number }> }>)[model];
    if (!delegate) throw new Error('Cleanup delegate unavailable');
    const ids = await delegate.findMany({ where, select: { id: true }, orderBy: { [orderField]: 'asc' }, take: batch });
    if (!ids.length) return 0;
    return (await delegate.deleteMany({ where: { id: { in: ids.map((row) => row.id) } } })).count;
  }

  private retention(key: 'loginAttemptsDays' | 'challengesDays' | 'sessionsDays' | 'invitationsDays' | 'auditDays'): number { return this.config.get<number>(`retention.${key}`, 90); }
  private daysAgo(days: number): Date { return new Date(Date.now() - days * 86400000); }
  private lockKey(name: string): bigint { return BigInt(`0x${createHash('sha256').update(name).digest('hex').slice(0, 15)}`); }
  private readonly isTransient = (error: unknown): boolean => error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1008', 'P2024'].includes(error.code);
}
