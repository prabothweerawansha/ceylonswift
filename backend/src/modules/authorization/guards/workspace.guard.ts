import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { PermissionResolverService } from '../services/permission-resolver.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly resolver: PermissionResolverService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.authorization = await this.resolver.resolve(request.principal.userId, request.principal.sessionId);
    return true;
  }
}
