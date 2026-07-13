import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ResourceOwnershipPolicyService {
  assertOwner(authenticatedUserId: string, ownerUserId: string): void {
    if (authenticatedUserId !== ownerUserId) throw new ForbiddenException({ code: 'AUTH_RESOURCE_DENIED', message: 'The requested resource is unavailable.', details: null });
  }
  customerWhere<T extends object>(authenticatedUserId: string, criteria: T): T & { customerId: string } { return { ...criteria, customerId: authenticatedUserId }; }
  riderWhere<T extends object>(riderProfileId: string, criteria: T): T & { riderId: string } { return { ...criteria, riderId: riderProfileId }; }
}
