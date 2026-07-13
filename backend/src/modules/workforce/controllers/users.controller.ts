import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { AccountStatusDto, DirectoryQueryDto } from '../dto/workforce.dto';
import { WorkforceService } from '../services/workforce.service';

@Controller('users') @UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly service: WorkforceService) {}
  @Get() @RequirePermissions('staff.read') list(@Query() query: DirectoryQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.users(query, context); }
  @Get(':userId') @RequirePermissions('staff.read') get(@Param('userId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.user(id, context); }
  @Get(':userId/roles') @RequirePermissions('role.read') roles(@Param('userId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.roles(id, context); }
  @Get(':userId/memberships') @RequirePermissions('staff.read') memberships(@Param('userId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.memberships(id, context); }
  @Patch(':userId/status') @RequirePermissions('staff.suspend') status(@Param('userId') id: string, @Body() dto: AccountStatusDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setAccountStatus(id, dto, context, request.requestId); }
}
