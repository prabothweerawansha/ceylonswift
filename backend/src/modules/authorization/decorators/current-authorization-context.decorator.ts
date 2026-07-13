import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthorizationContext } from '../types/authorization-context';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';

export const CurrentAuthorizationContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthorizationContext => {
    const authorization = context.switchToHttp().getRequest<AuthenticatedRequest>().authorization;
    if (!authorization) throw new Error('Authorization context was not resolved.');
    return authorization;
  },
);
