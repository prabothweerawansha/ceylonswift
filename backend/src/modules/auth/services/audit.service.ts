import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(action: string, outcome: string, requestId: string, actorId?: string, sessionId?: string, metadata?: Prisma.InputJsonObject): Promise<void> {
    await this.prisma.auditLog.create({ data: { action, outcome, requestId, actorId, sessionId, metadata: metadata ?? undefined } });
  }
}
