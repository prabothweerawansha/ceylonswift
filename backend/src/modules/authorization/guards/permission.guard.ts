import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator';
import { AuthAuditService } from '../../auth/services/audit.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly audit: AuthAuditService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.authorization;
    if (!authorization || required.some((permission) => !authorization.permissions.has(permission))) {
      await this.audit.record('PERMISSION_DENIED', 'DENIED', request.requestId, request.principal?.userId, request.principal?.sessionId, { required });
      throw new ForbiddenException({ code: 'AUTH_PERMISSION_DENIED', message: 'You are not authorized to perform this action.', details: null });
    }
    return true;
  }
}
