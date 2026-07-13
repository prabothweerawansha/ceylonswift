import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { AuthAuditService } from '../../auth/services/audit.service';

@Injectable()
export class OrganizationScopeGuard implements CanActivate {
  constructor(private readonly audit: AuthAuditService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requested = request.params.organizationId;
    if (!request.authorization?.organizationId || requested !== request.authorization.organizationId) {
      await this.audit.record('CROSS_TENANT_ACCESS_ATTEMPTED', 'DENIED', request.requestId, request.principal.userId, request.principal.sessionId, { scope: 'ORGANIZATION' });
      throw new ForbiddenException({ code: 'AUTH_SCOPE_DENIED', message: 'The requested resource is unavailable.', details: null });
    }
    return true;
  }
}
