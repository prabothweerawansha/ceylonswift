import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { CurrentAuthorizationContext } from '../decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { WorkspaceGuard } from '../guards/workspace.guard';
import type { AuthorizationContext } from '../types/authorization-context';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { AssignRoleDto } from '../dto/assign-role.dto';

@Controller()
@UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly roles: RoleAssignmentService) {}
  @Get('roles') @RequirePermissions('role.read')
  list(@CurrentAuthorizationContext() context: AuthorizationContext) { return this.roles.listRoles(context); }
  @Get('permissions') @RequirePermissions('permission.read')
  permissions() { return this.roles.listPermissions(); }
  @Get('roles/:roleId/permissions') @RequirePermissions('permission.read')
  rolePermissions(@Param('roleId') roleId: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.roles.rolePermissions(roleId, context); }
  @Get('users/:userId/roles') @RequirePermissions('role.read')
  userRoles(@Param('userId') userId: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.roles.userRoles(userId, context); }
  @Post('users/:userId/roles') @HttpCode(201) @RequirePermissions('role.assign')
  assign(@Param('userId') userId: string, @Body() dto: AssignRoleDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.roles.assign(userId, dto.roleId, dto.branchId, dto.reason, context, request.requestId); }
  @Delete('users/:userId/roles/:userRoleId') @RequirePermissions('role.revoke')
  revoke(@Param('userId') userId: string, @Param('userRoleId') userRoleId: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.roles.revoke(userId, userRoleId, context, request.requestId); }
}
