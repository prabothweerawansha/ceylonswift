import type { RequestWithId } from '../../../common/types/request-with-id';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends RequestWithId {
  principal: AuthenticatedPrincipal;
  authorization?: AuthorizationContext;
}
