import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMode, PricingRuleStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { PricingCalculationDto } from '../dto/operations.dto';

interface RuleDefinition {
  baseFee: number;
  includedWeightKg: number;
  perAdditionalKg: number;
  minimumFee: number;
  interBranchSurcharge: number;
  codRate: number;
  codMinimum: number;
}

const DEFAULT_RULE: RuleDefinition = {
  baseFee: 250,
  includedWeightKg: 1,
  perAdditionalKg: 80,
  minimumFee: 250,
  interBranchSurcharge: 150,
  codRate: 0.01,
  codMinimum: 50,
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: PricingCalculationDto) {
    const hubs = await this.prisma.hub.findMany({
      where: { id: { in: [dto.originHubId, dto.destinationHubId] }, status: 'ACTIVE', deletedAt: null },
      select: { id: true, organizationId: true, branchId: true },
    });
    if (hubs.length !== (dto.originHubId === dto.destinationHubId ? 1 : 2)) {
      throw new NotFoundException({ code: 'PRICING_ROUTE_UNAVAILABLE', message: 'The selected delivery route is unavailable.', details: null });
    }
    const origin = hubs.find((hub) => hub.id === dto.originHubId);
    const destination = dto.originHubId === dto.destinationHubId ? origin : hubs.find((hub) => hub.id === dto.destinationHubId);
    if (!origin || !destination || origin.organizationId !== destination.organizationId) {
      throw new NotFoundException({ code: 'PRICING_ROUTE_UNAVAILABLE', message: 'The selected delivery route is unavailable.', details: null });
    }
    if (dto.paymentMode !== PaymentMode.COD && dto.codAmount) {
      throw new ConflictException({ code: 'PRICING_COD_INVALID', message: 'A COD amount is allowed only for COD deliveries.', details: null });
    }
    const now = new Date();
    const rule = await this.prisma.pricingRule.findFirst({
      where: {
        organizationId: origin.organizationId,
        serviceLevel: dto.serviceLevel.toUpperCase(),
        status: PricingRuleStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
      select: { id: true, key: true, currency: true, ruleDefinition: true, effectiveFrom: true, effectiveUntil: true },
    });
    if (!rule) {
      throw new NotFoundException({ code: 'PRICING_RULE_UNAVAILABLE', message: 'Pricing is unavailable for the selected service.', details: null });
    }
    const definition = this.definition(rule.ruleDefinition);
    const baseFee = definition.baseFee;
    const billableWeight = Math.max(0, Math.ceil(dto.weightKg - definition.includedWeightKg));
    const weightSurcharge = billableWeight * definition.perAdditionalKg;
    const zoneSurcharge = origin.branchId === destination.branchId ? 0 : definition.interBranchSurcharge;
    const codSurcharge = dto.paymentMode === PaymentMode.COD
      ? Math.max(definition.codMinimum, (dto.codAmount ?? 0) * definition.codRate)
      : 0;
    const subtotal = baseFee + weightSurcharge + zoneSurcharge + codSurcharge;
    const total = Math.max(definition.minimumFee, subtotal);
    return {
      currency: rule.currency,
      serviceLevel: dto.serviceLevel.toUpperCase(),
      amount: total.toFixed(2),
      breakdown: {
        baseFee: baseFee.toFixed(2),
        weightSurcharge: weightSurcharge.toFixed(2),
        zoneSurcharge: zoneSurcharge.toFixed(2),
        codSurcharge: codSurcharge.toFixed(2),
        minimumFeeApplied: total > subtotal,
      },
      rule: { key: rule.key, effectiveFrom: rule.effectiveFrom, effectiveUntil: rule.effectiveUntil },
      route: { originHubId: dto.originHubId, destinationHubId: dto.destinationHubId },
    };
  }

  async rules(organizationId: string, branchId: string | null) {
    const now = new Date();
    return this.prisma.pricingRule.findMany({
      where: {
        organizationId,
        status: PricingRuleStatus.ACTIVE,
        effectiveFrom: { lte: now },
        AND: [
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
          ...(branchId ? [{ OR: [{ branchId }, { branchId: null }] }] : []),
        ],
      },
      select: { id: true, key: true, serviceLevel: true, currency: true, effectiveFrom: true, effectiveUntil: true },
      orderBy: [{ priority: 'desc' }, { key: 'asc' }],
    });
  }

  private definition(value: Prisma.JsonValue): RuleDefinition {
    if (!value || Array.isArray(value) || typeof value !== 'object') return DEFAULT_RULE;
    const input = value as Record<string, unknown>;
    const number = (key: keyof RuleDefinition): number => typeof input[key] === 'number' ? input[key] : DEFAULT_RULE[key];
    return {
      baseFee: number('baseFee'),
      includedWeightKg: number('includedWeightKg'),
      perAdditionalKg: number('perAdditionalKg'),
      minimumFee: number('minimumFee'),
      interBranchSurcharge: number('interBranchSurcharge'),
      codRate: number('codRate'),
      codMinimum: number('codMinimum'),
    };
  }
}
