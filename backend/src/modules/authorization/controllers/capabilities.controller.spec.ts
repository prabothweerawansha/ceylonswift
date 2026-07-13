import { CapabilitiesController } from './capabilities.controller';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';

describe('CapabilitiesController', () => {
  it('returns only the active workspace capability summary', () => {
    const controller = new CapabilitiesController();
    const request = {
      principal: { userId: 'user-a', sessionId: 'session-a' },
      authorization: {
        userId: 'user-a', sessionId: 'session-a', workspaceType: 'ORGANIZATION', membershipId: 'membership-a', organizationId: 'organization-a', branchId: 'branch-a',
        roles: ['OFFICE_STAFF'], permissions: new Set(['hub.read', 'package.read.branch']), authenticationStrength: 1, recentAuthenticationAt: new Date(), mfaCompletedAt: null,
      },
    } as AuthenticatedRequest;

    expect(controller.current(request)).toEqual({
      workspace: { type: 'ORGANIZATION', membershipId: 'membership-a', organizationId: 'organization-a', branchId: 'branch-a' },
      roles: ['OFFICE_STAFF'],
      permissions: ['hub.read', 'package.read.branch'],
    });
  });

  it('fails closed when workspace authorization context is missing', () => {
    const controller = new CapabilitiesController();
    expect(() => controller.current({ principal: { userId: 'user-a', sessionId: 'session-a' } } as AuthenticatedRequest)).toThrow('selected workspace');
  });
});
