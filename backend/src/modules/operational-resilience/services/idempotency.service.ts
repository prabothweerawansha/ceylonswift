import { BadRequestException, ConflictException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyState, Prisma, type IdempotencyRecord } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { redactSensitive } from '../../../common/security/redaction';
import { MetricsService } from './metrics.service';

export interface IdempotencyInput {
  key: string;
  method: string;
  endpoint: string;
  body: unknown;
  params: unknown;
  context: AuthorizationContext;
}

export interface IdempotencyResult<T> { value: T; replayed: boolean; statusCode?: number }

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly metrics: MetricsService) {}

  async execute<T>(input: IdempotencyInput, statusCode: number, operation: () => Promise<T>): Promise<IdempotencyResult<T>> {
    this.validateKey(input.key);
    const identity = this.identity(input);
    const acquired = await this.acquire(input, identity);
    if (acquired.replay) {
      this.metrics.increment('idempotency_replays_total', { outcome: 'replay' });
      return { value: acquired.record.responseBody as T, replayed: true, statusCode: acquired.record.responseStatus ?? statusCode };
    }
    try {
      const result = await operation();
      const safe = redactSensitive(result) as Prisma.InputJsonValue;
      await this.prisma.idempotencyRecord.update({
        where: { id: acquired.record.id },
        data: { state: IdempotencyState.COMPLETED, responseStatus: statusCode, responseBody: safe, completedAt: new Date(), failureCode: null },
      });
      return { value: safe as T, replayed: false, statusCode };
    } catch (error) {
      const code = error instanceof HttpException ? String((error.getResponse() as { code?: string }).code ?? `HTTP_${error.getStatus()}`) : 'INTERNAL_ERROR';
      await this.prisma.idempotencyRecord.updateMany({ where: { id: acquired.record.id, state: IdempotencyState.IN_PROGRESS }, data: { state: IdempotencyState.FAILED, failureCode: code } });
      throw error;
    }
  }

  async cleanupExpired(batchSize: number): Promise<number> {
    const now = new Date();
    const rows = await this.prisma.idempotencyRecord.findMany({ where: { expiresAt: { lt: now } }, select: { id: true }, orderBy: { expiresAt: 'asc' }, take: batchSize });
    if (!rows.length) return 0;
    const changed = await this.prisma.idempotencyRecord.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
    return changed.count;
  }

  private async acquire(input: IdempotencyInput, identity: { scopeHash: string; keyHash: string; requestHash: string }, attempt = 0): Promise<{ record: IdempotencyRecord; replay: boolean }> {
    const now = new Date();
    const ttl = this.config.get<number>('idempotency.ttlSeconds', 86400);
    const staleSeconds = this.config.get<number>('idempotency.inProgressTimeoutSeconds', 120);
    const where = { scopeHash: identity.scopeHash, endpoint: input.endpoint, method: input.method, keyHash: identity.keyHash };
    try { return await this.prisma.$transaction(async (tx) => {
      let record = await tx.idempotencyRecord.findFirst({ where });
      if (!record) {
        record = await tx.idempotencyRecord.create({ data: {
          ...identity, userId: input.context.userId, organizationId: input.context.organizationId, branchId: input.context.branchId,
          workspaceType: input.context.workspaceType, endpoint: input.endpoint, method: input.method,
          expiresAt: new Date(now.getTime() + ttl * 1000),
        } });
        return { record, replay: false };
      }
      if (record.requestHash !== identity.requestHash) {
        this.metrics.increment('idempotency_conflicts_total', { outcome: 'payload_mismatch' });
        throw new ConflictException({ code: 'IDEMPOTENCY_PAYLOAD_MISMATCH', message: 'This idempotency key was already used with a different request.', details: null });
      }
      if (record.state === IdempotencyState.COMPLETED && record.expiresAt > now) return { record, replay: true };
      const stale = record.lockedAt.getTime() <= now.getTime() - staleSeconds * 1000;
      if (record.state === IdempotencyState.IN_PROGRESS && !stale && record.expiresAt > now) {
        this.metrics.increment('idempotency_conflicts_total', { outcome: 'in_progress' });
        throw new ConflictException({ code: 'IDEMPOTENCY_IN_PROGRESS', message: 'The original request is still processing. Retry shortly with the same key.', details: null });
      }
      record = await tx.idempotencyRecord.update({ where: { id: record.id }, data: {
        state: IdempotencyState.IN_PROGRESS, lockedAt: now, expiresAt: new Date(now.getTime() + ttl * 1000),
        attempts: { increment: 1 }, responseBody: Prisma.JsonNull, responseStatus: null, completedAt: null, failureCode: null,
      } });
      return { record, replay: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) return this.acquire(input, identity, attempt + 1);
      throw error;
    }
  }

  private identity(input: IdempotencyInput) {
    const scope = [input.context.userId, input.context.workspaceType, input.context.organizationId ?? '-', input.context.branchId ?? '-'].join('|');
    return {
      scopeHash: this.hash(scope),
      keyHash: this.hash(input.key),
      requestHash: this.hash(this.stable({ body: input.body, params: input.params })),
    };
  }

  private stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.stable(item)).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${this.stable(child)}`).join(',')}}`;
    return JSON.stringify(value) ?? 'null';
  }

  private hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
  private validateKey(key: string): void {
    if (!/^[A-Za-z0-9._:-]{8,200}$/.test(key)) throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_INVALID', message: 'A valid Idempotency-Key header is required.', details: null });
  }
}
