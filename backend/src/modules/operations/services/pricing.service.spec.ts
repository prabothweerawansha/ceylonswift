import { PaymentMode } from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const setup = () => {
    const hubFindMany = jest.fn().mockResolvedValue([
      { id: '11111111-1111-4111-8111-111111111111', organizationId: 'org', branchId: 'branch-a' },
      { id: '22222222-2222-4222-8222-222222222222', organizationId: 'org', branchId: 'branch-b' },
    ]);
    const ruleFindFirst = jest.fn().mockResolvedValue({
      id: 'rule', key: 'EXPRESS', currency: 'LKR', effectiveFrom: new Date(), effectiveUntil: null,
      ruleDefinition: { baseFee: 250, includedWeightKg: 1, perAdditionalKg: 80, minimumFee: 250, interBranchSurcharge: 150, codRate: 0.01, codMinimum: 50 },
    });
    const prisma = { hub: { findMany: hubFindMany }, pricingRule: { findFirst: ruleFindFirst } } as unknown as PrismaService;
    return { service: new PricingService(prisma), hubFindMany, ruleFindFirst };
  };

  it('calculates the backend-authoritative route, weight, and minimum COD fees', async () => {
    const { service } = setup();
    const result = await service.calculate({
      weightKg: 2.2,
      originHubId: '11111111-1111-4111-8111-111111111111',
      destinationHubId: '22222222-2222-4222-8222-222222222222',
      serviceLevel: 'EXPRESS', paymentMode: PaymentMode.COD, codAmount: 1000,
    });
    expect(result).toMatchObject({ amount: '610.00', currency: 'LKR', breakdown: { baseFee: '250.00', weightSurcharge: '160.00', zoneSurcharge: '150.00', codSurcharge: '50.00' } });
  });

  it('does not add a COD surcharge to prepaid pricing', async () => {
    const { service } = setup();
    const result = await service.calculate({
      weightKg: 1,
      originHubId: '11111111-1111-4111-8111-111111111111',
      destinationHubId: '22222222-2222-4222-8222-222222222222',
      serviceLevel: 'EXPRESS', paymentMode: PaymentMode.PREPAID,
    });
    expect(result.breakdown.codSurcharge).toBe('0.00');
    expect(result.amount).toBe('400.00');
  });
});

