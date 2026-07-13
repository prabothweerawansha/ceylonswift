import { ConflictException, Injectable } from '@nestjs/common';
import { PackageStatus, TrackingEventType } from '@prisma/client';

const TRANSITIONS: Readonly<Record<PackageStatus, readonly PackageStatus[]>> = Object.freeze({
  DRAFT: ['PENDING_CONFIRMATION', 'CANCELLED'],
  PENDING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['AWAITING_PICKUP', 'CANCELLED'],
  AWAITING_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['RECEIVED_AT_ORIGIN_HUB'],
  RECEIVED_AT_ORIGIN_HUB: ['IN_TRANSIT'],
  IN_TRANSIT: ['RECEIVED_AT_DESTINATION_HUB', 'RETURN_REQUESTED'],
  RECEIVED_AT_DESTINATION_HUB: ['OUT_FOR_DELIVERY', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_ATTEMPTED', 'DELIVERY_FAILED'],
  DELIVERY_ATTEMPTED: ['OUT_FOR_DELIVERY', 'DELIVERY_FAILED'],
  DELIVERED: ['RETURN_REQUESTED'],
  DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURN_IN_TRANSIT'],
  RETURN_IN_TRANSIT: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
});

const EVENT_BY_STATUS: Readonly<Partial<Record<PackageStatus, TrackingEventType>>> = Object.freeze({
  PENDING_CONFIRMATION: TrackingEventType.CREATED,
  CONFIRMED: TrackingEventType.CONFIRMED,
  AWAITING_PICKUP: TrackingEventType.PICKUP_SCHEDULED,
  PICKED_UP: TrackingEventType.PICKED_UP,
  RECEIVED_AT_ORIGIN_HUB: TrackingEventType.HUB_RECEIVED,
  IN_TRANSIT: TrackingEventType.IN_TRANSIT,
  RECEIVED_AT_DESTINATION_HUB: TrackingEventType.HUB_RECEIVED,
  OUT_FOR_DELIVERY: TrackingEventType.OUT_FOR_DELIVERY,
  DELIVERY_ATTEMPTED: TrackingEventType.DELIVERY_ATTEMPTED,
  DELIVERED: TrackingEventType.DELIVERED,
  DELIVERY_FAILED: TrackingEventType.DELIVERY_FAILED,
  RETURN_REQUESTED: TrackingEventType.RETURN_REQUESTED,
  RETURN_IN_TRANSIT: TrackingEventType.IN_TRANSIT,
  RETURNED: TrackingEventType.RETURNED,
  CANCELLED: TrackingEventType.CANCELLED,
});

export const RIDER_TRANSITIONS = new Set([
  'AWAITING_PICKUP:PICKED_UP',
  'RECEIVED_AT_DESTINATION_HUB:OUT_FOR_DELIVERY',
  'OUT_FOR_DELIVERY:DELIVERED',
  'OUT_FOR_DELIVERY:DELIVERY_ATTEMPTED',
  'DELIVERY_ATTEMPTED:OUT_FOR_DELIVERY',
  'OUT_FOR_DELIVERY:DELIVERY_FAILED',
]);

@Injectable()
export class PackageTransitionService {
  assertAllowed(current: PackageStatus, next: PackageStatus): void {
    if (!TRANSITIONS[current].includes(next)) {
      throw new ConflictException({
        code: 'PACKAGE_STATUS_TRANSITION_INVALID',
        message: `A package cannot move from ${current} to ${next}.`,
        details: { current, requested: next },
      });
    }
  }

  eventFor(status: PackageStatus): TrackingEventType {
    return EVENT_BY_STATUS[status] ?? TrackingEventType.NOTE;
  }
}

