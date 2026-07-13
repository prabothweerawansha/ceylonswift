import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccessTokenService } from '../services/access-token.service';
import { AuthService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokenService, private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Authentication is required.', details: null });
    const claims = this.tokens.verify(header.slice(7));
    if (!(await this.auth.validatePrincipal(claims.sub, claims.sid))) throw new UnauthorizedException({ code: 'AUTH_SESSION_INVALID', message: 'Authentication is required.', details: null });
    request.principal = { userId: claims.sub, sessionId: claims.sid };
    return true;
  }
}
