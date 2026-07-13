import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { AssignmentDto, CancelDto, OperationalListQueryDto, PackageCreateDto, PackageUpdateDto, StatusTransitionDto, UnassignDto } from '../dto/operations.dto';
import { OperationsService } from '../services/operations.service';
import { DurableIdempotency } from '../../operational-resilience/decorators/durable-idempotency.decorator';

@Controller('packages')
@UseGuards(AccessTokenGuard, WorkspaceGuard)
export class PackagesController {
  constructor(private readonly operations: OperationsService) {}

  @Post() @DurableIdempotency() create(@Body() dto: PackageCreateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.createPackage(dto, context, request.requestId); }
  @Get() list(@Query() query: OperationalListQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.packages(query, context); }
  @Get(':packageId') get(@Param('packageId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.package(id, context); }
  @Patch(':packageId') update(@Param('packageId') id: string, @Body() dto: PackageUpdateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.updatePackage(id, dto, context, request.requestId); }
  @Post(':packageId/status') @DurableIdempotency() status(@Param('packageId') id: string, @Body() dto: StatusTransitionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.transition(id, dto, context, request.requestId); }
  @Post(':packageId/cancel') cancel(@Param('packageId') id: string, @Body() dto: CancelDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.cancelPackage(id, dto, context, request.requestId); }
  @Get(':packageId/tracking') tracking(@Param('packageId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.tracking(id, context); }
  @Get(':packageId/assignments') assignments(@Param('packageId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.assignments(id, context); }
  @Post(':packageId/assign') @DurableIdempotency() assign(@Param('packageId') id: string, @Body() dto: AssignmentDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.assign(id, dto, context, request.requestId); }
  @Post(':packageId/reassign') @DurableIdempotency() reassign(@Param('packageId') id: string, @Body() dto: AssignmentDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.reassign(id, dto, context, request.requestId); }
  @Post(':packageId/unassign') unassign(@Param('packageId') id: string, @Body() dto: UnassignDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.unassign(id, dto, context, request.requestId); }
}
