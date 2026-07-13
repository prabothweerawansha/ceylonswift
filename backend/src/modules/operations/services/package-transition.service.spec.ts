import { ConflictException } from '@nestjs/common';
import { PackageStatus, TrackingEventType } from '@prisma/client';
import { PackageTransitionService, RIDER_TRANSITIONS } from './package-transition.service';

describe('PackageTransitionService', () => {
  const service = new PackageTransitionService();

  it('accepts the canonical forward package lifecycle', () => {
    const path = [
      PackageStatus.DRAFT, PackageStatus.PENDING_CONFIRMATION, PackageStatus.CONFIRMED,
      PackageStatus.AWAITING_PICKUP, PackageStatus.PICKED_UP, PackageStatus.RECEIVED_AT_ORIGIN_HUB,
      PackageStatus.IN_TRANSIT, PackageStatus.RECEIVED_AT_DESTINATION_HUB,
      PackageStatus.OUT_FOR_DELIVERY, PackageStatus.DELIVERED,
    ];
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(() => service.assertAllowed(path[index]!, path[index + 1]!)).not.toThrow();
    }
  });

  it('rejects skips and final-state mutation', () => {
    expect(() => service.assertAllowed(PackageStatus.DRAFT, PackageStatus.DELIVERED)).toThrow(ConflictException);
    expect(() => service.assertAllowed(PackageStatus.CANCELLED, PackageStatus.CONFIRMED)).toThrow(ConflictException);
    expect(() => service.assertAllowed(PackageStatus.RETURNED, PackageStatus.OUT_FOR_DELIVERY)).toThrow(ConflictException);
  });

  it('maps lifecycle states to append-only tracking event types', () => {
    expect(service.eventFor(PackageStatus.DELIVERED)).toBe(TrackingEventType.DELIVERED);
    expect(service.eventFor(PackageStatus.RECEIVED_AT_ORIGIN_HUB)).toBe(TrackingEventType.HUB_RECEIVED);
    expect(RIDER_TRANSITIONS.has('OUT_FOR_DELIVERY:DELIVERED')).toBe(true);
    expect(RIDER_TRANSITIONS.has('CONFIRMED:DELIVERED')).toBe(false);
  });
});
