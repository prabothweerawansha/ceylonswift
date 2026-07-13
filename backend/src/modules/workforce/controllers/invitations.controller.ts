import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { DirectoryQueryDto, InvitationAcceptDto, InvitationCreateDto } from '../dto/workforce.dto';
import { WorkforceService } from '../services/workforce.service';

@Controller('invitations') @UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class InvitationsController {
  constructor(private readonly service: WorkforceService) {}
  @Get() @RequirePermissions('staff.read') list(@Query() query: DirectoryQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.invitations(query, context); }
  @Post() @RequirePermissions('staff.invite') create(@Body() dto: InvitationCreateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.createInvitation(dto, context, request.requestId); }
  @Get(':invitationId') @RequirePermissions('staff.read') get(@Param('invitationId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.invitation(id, context); }
  @Post(':invitationId/revoke') @HttpCode(200) @RequirePermissions('staff.invite') revoke(@Param('invitationId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.revokeInvitation(id, context, request.requestId); }
}

@Controller('invitations')
export class InvitationAcceptanceController {
  constructor(private readonly service: WorkforceService) {}
  @Post('accept') @HttpCode(200) accept(@Body() dto: InvitationAcceptDto, @Req() request: RequestWithId) { return this.service.acceptInvitation(dto, request.requestId); }
}
