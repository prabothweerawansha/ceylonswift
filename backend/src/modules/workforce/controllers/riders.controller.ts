import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { DecisionDto, DirectoryQueryDto, RiderStatusDto, RiderUpdateDto } from '../dto/workforce.dto';
import { WorkforceService } from '../services/workforce.service';

@Controller('riders') @UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class RidersController {
  constructor(private readonly service: WorkforceService) {}
  @Get() @RequirePermissions('rider.read') list(@Query() query: DirectoryQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.riders(query, context); }
  @Get(':riderId') @RequirePermissions('rider.read') get(@Param('riderId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.rider(id, context); }
  @Patch(':riderId') @RequirePermissions('rider.suspend') update(@Param('riderId') id: string, @Body() dto: RiderUpdateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.updateRider(id, dto, context, request.requestId); }
  @Patch(':riderId/status') @RequirePermissions('rider.suspend') status(@Param('riderId') id: string, @Body() dto: RiderStatusDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setRiderStatus(id, dto, context, request.requestId); }
  @Post(':riderId/approve') @RequirePermissions('rider.approve') approve(@Param('riderId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideRider(id, true, dto, context, request.requestId); }
  @Post(':riderId/reject') @RequirePermissions('rider.approve') reject(@Param('riderId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideRider(id, false, dto, context, request.requestId); }
  @Post(':riderId/suspend') @RequirePermissions('rider.suspend') suspend(@Param('riderId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setRiderStatus(id, { status: 'SUSPENDED', reason: dto.reason }, context, request.requestId); }
  @Post(':riderId/reactivate') @RequirePermissions('rider.suspend') reactivate(@Param('riderId') id: string, @Body() dto: DecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setRiderStatus(id, { status: 'AVAILABLE', reason: dto.reason }, context, request.requestId); }
}
