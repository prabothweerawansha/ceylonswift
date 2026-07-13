import { Injectable } from '@nestjs/common';

export interface InvitationDelivery {
  invitationId: string;
  destination: string;
  acceptanceToken: string;
  expiresAt: Date;
}

/**
 * Replaceable boundary for a future approved email/SMS provider. Phase 6 does not
 * transmit invitations externally and deliberately does not log or persist tokens.
 */
@Injectable()
export class InvitationDeliveryService {
  async deliver(invitation: InvitationDelivery): Promise<void> {
    void invitation;
    await Promise.resolve();
  }
}
