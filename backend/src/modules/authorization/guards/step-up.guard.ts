import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { STEP_UP_REQUIREMENT, type StepUpRequirement } from '../decorators/require-step-up.decorator';
import { StepUpPolicyService } from '../services/step-up-policy.service';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly policies: StepUpPolicyService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<StepUpRequirement>(STEP_UP_REQUIREMENT, [context.getHandler(), context.getClass()]);
    if (!requirement) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authorization || !this.policies.satisfies(request.authorization, requirement)) {
      await this.policies.recordRequired(request.requestId, request.principal.userId, request.principal.sessionId);
      throw new HttpException({ code: 'AUTH_STEP_UP_REQUIRED', message: 'Additional authentication is required.', details: { methods: requirement.requireMfa ? ['MFA', 'RECENT_LOGIN'] : ['RECENT_LOGIN'] } }, HttpStatus.PRECONDITION_REQUIRED);
    }
    return true;
  }
}
