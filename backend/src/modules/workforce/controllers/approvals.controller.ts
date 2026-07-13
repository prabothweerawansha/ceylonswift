import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { ApprovalQueryDto, DecisionDto } from '../dto/workforce.dto';
import { WorkforceService } from '../services/workforce.service';

@Controller('approvals') @UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class ApprovalsController {
  constructor(private readonly service: WorkforceService) {}
  @Get() @RequirePermissions('staff.read') list(@Query() query: ApprovalQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.approvals(query, context); }
  @Get(':approvalId') @RequirePermissions('staff.read') get(@Param('approvalId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.approval(id, context); }
  @Post(':approvalId/approve') @HttpCode(200) approve(@Param('approvalId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideApproval(id, true, dto, context, request.requestId); }
  @Post(':approvalId/reject') @HttpCode(200) reject(@Param('approvalId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideApproval(id, false, dto, context, request.requestId); }
}
