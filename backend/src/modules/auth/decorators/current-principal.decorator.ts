import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedPrincipal } from '../types/authenticated-request';

export const CurrentPrincipal = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => context.switchToHttp().getRequest<AuthenticatedRequest>().principal);
