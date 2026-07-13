import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { WorkspaceGuard } from '../guards/workspace.guard';

@Controller('auth/capabilities')
@UseGuards(AccessTokenGuard, WorkspaceGuard)
export class CapabilitiesController {
  @Get()
  current(@Req() request: AuthenticatedRequest) {
    const context = request.authorization;
    if (!context) {
      throw new ForbiddenException({ code: 'AUTH_WORKSPACE_INVALID', message: 'The selected workspace is unavailable.', details: null });
    }
    return {
      workspace: {
        type: context.workspaceType,
        membershipId: context.membershipId,
        organizationId: context.organizationId,
        branchId: context.branchId,
      },
      roles: [...context.roles].sort(),
      permissions: [...context.permissions].sort(),
    };
  }
}
