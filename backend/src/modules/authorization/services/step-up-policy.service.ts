import { Injectable } from '@nestjs/common';
import { AuthAuditService } from '../../auth/services/audit.service';
import type { StepUpRequirement } from '../decorators/require-step-up.decorator';
import type { AuthorizationContext } from '../types/authorization-context';

@Injectable()
export class StepUpPolicyService {
  constructor(private readonly audit: AuthAuditService) {}
  satisfies(context: AuthorizationContext, requirement: StepUpRequirement, now = new Date()): boolean {
    const maximumAge = (requirement.maxAgeSeconds ?? 600) * 1000;
    if (now.getTime() - context.recentAuthenticationAt.getTime() > maximumAge) return false;
    if (context.authenticationStrength < (requirement.minimumStrength ?? 1)) return false;
    if (requirement.requireMfa && !context.mfaCompletedAt) return false;
    return true;
  }
  recordRequired(requestId: string, userId: string, sessionId: string): Promise<void> {
    return this.audit.record('STEP_UP_AUTHENTICATION_REQUIRED', 'DENIED', requestId, userId, sessionId);
  }
}
