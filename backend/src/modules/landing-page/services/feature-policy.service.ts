import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeaturePolicyScope, FeaturePolicyState, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import type { UpsertFeaturePolicyDto } from '../dto/landing-page.dto';

export const PUBLIC_FEATURE_DEFAULTS = Object.freeze({
  'public.track_parcel': FeaturePolicyState.ENABLED,
  'public.send_parcel': FeaturePolicyState.COMING_SOON,
  'public.join_business': FeaturePolicyState.ENABLED,
  'public.rate_calculator': FeaturePolicyState.COMING_SOON,
  'public.hubs': FeaturePolicyState.COMING_SOON,
  'public.customer_signup': FeaturePolicyState.DISABLED,
} satisfies Record<string, FeaturePolicyState>);

export const FEATURE_CATALOG = Object.freeze(Object.keys(PUBLIC_FEATURE_DEFAULTS));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_CONFIGURATION_BYTES = 4096;

export type PublicFeatureState = {
  state: FeaturePolicyState;
  version: number;
};

@Injectable()
export class FeaturePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async publicStates(now = new Date()): Promise<Record<string, PublicFeatureState>> {
    const policies = await this.prisma.featurePolicy.findMany({
      where: {
        featureKey: { in: [...FEATURE_CATALOG] },
        scopeType: FeaturePolicyScope.GLOBAL,
        scopeId: 'GLOBAL',
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { featureKey: true, state: true, version: true },
    });
    const resolved = Object.fromEntries(
      Object.entries(PUBLIC_FEATURE_DEFAULTS).map(([featureKey, state]) => [featureKey, { state, version: 0 }]),
    ) as Record<string, PublicFeatureState>;
    for (const policy of policies) resolved[policy.featureKey] = { state: policy.state, version: policy.version };
    return resolved;
  }

  async assertEnabled(featureKey: string, now = new Date()): Promise<void> {
    this.assertFeature(featureKey);
    const state = (await this.publicStates(now))[featureKey]?.state;
    if (state !== FeaturePolicyState.ENABLED) {
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'This feature is not currently available.',
        details: { featureKey, state },
      });
    }
  }

  list(context: AuthorizationContext) {
    return this.prisma.featurePolicy.findMany({
      where: this.visibleScope(context),
      orderBy: [{ featureKey: 'asc' }, { scopeType: 'asc' }, { scopeId: 'asc' }],
      select: {
        id: true, featureKey: true, scopeType: true, scopeId: true, state: true,
        configuration: true, effectiveFrom: true, effectiveUntil: true, version: true,
        reason: true, updatedAt: true,
      },
    });
  }

  async upsert(featureKey: string, dto: UpsertFeaturePolicyDto, context: AuthorizationContext, requestId: string) {
    this.assertFeature(featureKey);
    this.assertScope(dto, context);
    this.assertConfiguration(dto.configuration);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    if (effectiveUntil && effectiveUntil <= effectiveFrom) {
      throw new BadRequestException({ code: 'FEATURE_POLICY_WINDOW_INVALID', message: 'The feature-policy end time must be after its start time.', details: null });
    }

    return this.prisma.$transaction(async (tx) => {
      const key = { featureKey_scopeType_scopeId: { featureKey, scopeType: dto.scopeType, scopeId: dto.scopeId } };
      const current = await tx.featurePolicy.findUnique({ where: key });
      if ((!current && dto.expectedVersion !== 0) || (current && dto.expectedVersion !== current.version)) {
        throw new ConflictException({
          code: 'FEATURE_POLICY_VERSION_CONFLICT',
          message: 'This feature policy changed before your update was applied.',
          details: { currentVersion: current?.version ?? 0 },
        });
      }

      const data = {
        state: dto.state,
        configuration: (dto.configuration ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
        effectiveFrom,
        effectiveUntil,
        reason: dto.reason.trim(),
        updatedById: context.userId,
      };
      const policy = current
        ? await tx.featurePolicy.update({ where: { id: current.id }, data: { ...data, version: { increment: 1 } } })
        : await tx.featurePolicy.create({
            data: {
              featureKey, scopeType: dto.scopeType, scopeId: dto.scopeId,
              ...data, version: 1,
            },
          });

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          branchId: context.branchId,
          actorId: context.userId,
          sessionId: context.sessionId,
          action: current ? 'FEATURE_POLICY_UPDATED' : 'FEATURE_POLICY_CREATED',
          resourceType: 'FeaturePolicy',
          resourceId: policy.id,
          outcome: 'SUCCESS',
          requestId,
          metadata: {
            featureKey,
            scopeType: dto.scopeType,
            scopeId: dto.scopeId,
            previousState: current?.state ?? null,
            nextState: policy.state,
            previousVersion: current?.version ?? 0,
            nextVersion: policy.version,
            reason: dto.reason.trim(),
          },
        },
      });
      return policy;
    });
  }

  requireKnown(featureKey: string): void {
    this.assertFeature(featureKey);
  }

  private assertFeature(featureKey: string): void {
    if (!FEATURE_CATALOG.includes(featureKey)) {
      throw new NotFoundException({ code: 'FEATURE_POLICY_KEY_NOT_FOUND', message: 'Feature policy not found.', details: null });
    }
  }

  private assertScope(dto: UpsertFeaturePolicyDto, context: AuthorizationContext): void {
    if (dto.scopeType === FeaturePolicyScope.GLOBAL) {
      if (dto.scopeId !== 'GLOBAL') throw this.scopeError();
      return;
    }
    if (!UUID.test(dto.scopeId)) throw this.scopeError();
    const elevated = context.roles.includes('OWNER') || context.roles.includes('SUPER_ADMIN');
    if (dto.scopeType === FeaturePolicyScope.ORGANIZATION && !elevated && context.organizationId !== dto.scopeId) throw this.denied();
    if (dto.scopeType === FeaturePolicyScope.BRANCH && !elevated && context.branchId !== dto.scopeId) throw this.denied();
    if (dto.scopeType === FeaturePolicyScope.USER && !elevated && context.userId !== dto.scopeId) throw this.denied();
  }

  private visibleScope(context: AuthorizationContext): Prisma.FeaturePolicyWhereInput {
    if (context.roles.includes('OWNER') || context.roles.includes('SUPER_ADMIN')) return {};
    const scopes: Prisma.FeaturePolicyWhereInput[] = [{ scopeType: FeaturePolicyScope.GLOBAL, scopeId: 'GLOBAL' }];
    if (context.organizationId) scopes.push({ scopeType: FeaturePolicyScope.ORGANIZATION, scopeId: context.organizationId });
    if (context.branchId) scopes.push({ scopeType: FeaturePolicyScope.BRANCH, scopeId: context.branchId });
    scopes.push({ scopeType: FeaturePolicyScope.USER, scopeId: context.userId });
    return { OR: scopes };
  }

  private assertConfiguration(configuration: Record<string, unknown> | undefined): void {
    if (!configuration) return;
    const value = JSON.stringify(configuration);
    if (value.length > MAX_PUBLIC_CONFIGURATION_BYTES || /<script|javascript:|onerror\s*=|onload\s*=/i.test(value)) {
      throw new BadRequestException({ code: 'FEATURE_POLICY_CONFIGURATION_INVALID', message: 'The feature configuration is not allowed.', details: null });
    }
  }

  private scopeError() {
    return new BadRequestException({ code: 'FEATURE_POLICY_SCOPE_INVALID', message: 'The feature-policy scope is invalid.', details: null });
  }

  private denied() {
    return new ForbiddenException({ code: 'FEATURE_POLICY_SCOPE_DENIED', message: 'You cannot manage this feature-policy scope.', details: null });
  }
}
