import type { AuthAuditService } from '../../auth/services/audit.service';
import type { AuthorizationContext } from '../types/authorization-context';
import { StepUpPolicyService } from './step-up-policy.service';

describe('StepUpPolicyService', () => {
  const audit = { record: jest.fn() } as unknown as AuthAuditService;
  const service = new StepUpPolicyService(audit);
  const context = (overrides: Partial<AuthorizationContext> = {}): AuthorizationContext => ({ userId: 'u', sessionId: 's', workspaceType: 'ORGANIZATION', membershipId: 'm', organizationId: 'o', branchId: 'b', roles: ['ADMIN'], permissions: new Set(), authenticationStrength: 2, recentAuthenticationAt: new Date(), mfaCompletedAt: new Date(), ...overrides });
  it('accepts recent strong MFA authentication', () => expect(service.satisfies(context(), { maxAgeSeconds: 600, requireMfa: true, minimumStrength: 2 })).toBe(true));
  it('rejects stale authentication', () => expect(service.satisfies(context({ recentAuthenticationAt: new Date(0) }), { maxAgeSeconds: 600 })).toBe(false));
  it('rejects missing MFA and insufficient assurance', () => {
    expect(service.satisfies(context({ mfaCompletedAt: null }), { requireMfa: true })).toBe(false);
    expect(service.satisfies(context({ authenticationStrength: 1 }), { minimumStrength: 2 })).toBe(false);
  });
});
