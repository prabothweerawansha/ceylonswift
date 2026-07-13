import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentPrincipal } from '../../auth/decorators/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../../auth/types/authenticated-request';
import { CurrentAuthorizationContext } from '../decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { OrganizationScopeGuard } from '../guards/organization-scope.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { WorkspaceGuard } from '../guards/workspace.guard';
import { OrganizationAccessService } from '../services/organization-access.service';
import type { AuthorizationContext } from '../types/authorization-context';

@Controller('organizations')
@UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationAccessService) {}
  @Get() @RequirePermissions('organization.read')
  list(@CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.organizations.list(principal.userId); }
  @Get(':organizationId') @RequirePermissions('organization.read') @UseGuards(OrganizationScopeGuard)
  get(@Param('organizationId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.organizations.get(id, context); }
  @Get(':organizationId/memberships') @RequirePermissions('staff.read') @UseGuards(OrganizationScopeGuard)
  memberships(@Param('organizationId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.organizations.memberships(id, context); }
  @Get(':organizationId/branches') @RequirePermissions('branch.read') @UseGuards(OrganizationScopeGuard)
  branches(@Param('organizationId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.organizations.branches(id, context); }
}
