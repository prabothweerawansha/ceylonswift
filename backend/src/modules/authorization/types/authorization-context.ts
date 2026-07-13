export type WorkspaceType = 'PERSONAL' | 'ORGANIZATION';

export interface AuthorizationContext {
  userId: string;
  sessionId: string;
  workspaceType: WorkspaceType;
  membershipId: string | null;
  organizationId: string | null;
  branchId: string | null;
  roles: string[];
  permissions: Set<string>;
  authenticationStrength: number;
  recentAuthenticationAt: Date;
  mfaCompletedAt: Date | null;
}
