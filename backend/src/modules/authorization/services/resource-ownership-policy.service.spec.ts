import { ForbiddenException } from '@nestjs/common';
import { ResourceOwnershipPolicyService } from './resource-ownership-policy.service';

describe('ResourceOwnershipPolicyService', () => {
  const service = new ResourceOwnershipPolicyService();
  it('allows only the resource owner', () => {
    expect(() => service.assertOwner('customer-a', 'customer-a')).not.toThrow();
    expect(() => service.assertOwner('customer-a', 'customer-b')).toThrow(ForbiddenException);
  });
  it('adds non-bypassable customer and rider filters', () => {
    expect(service.customerWhere('customer-a', { id: 'package' })).toEqual({ id: 'package', customerId: 'customer-a' });
    expect(service.riderWhere('rider-a', { id: 'assignment' })).toEqual({ id: 'assignment', riderId: 'rider-a' });
  });
});
