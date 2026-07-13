import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { CustomerRequestCreateDto, CustomerRequestUpdateDto, RequestListQueryDto } from '../dto/operations.dto';
import { OperationsService } from '../services/operations.service';
import { DurableIdempotency } from '../../operational-resilience/decorators/durable-idempotency.decorator';

@Controller('customer-requests')
@UseGuards(AccessTokenGuard, WorkspaceGuard)
export class CustomerRequestsController {
  constructor(private readonly operations: OperationsService) {}

  @Post() @DurableIdempotency() create(@Body() dto: CustomerRequestCreateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.createRequest(dto, context, request.requestId); }
  @Get() list(@Query() query: RequestListQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.requests(query, context); }
  @Get(':requestId') get(@Param('requestId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.request(id, context); }
  @Patch(':requestId') update(@Param('requestId') id: string, @Body() dto: CustomerRequestUpdateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.updateRequest(id, dto, context, request.requestId); }
  @Post(':requestId/submit') @DurableIdempotency() submit(@Param('requestId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.submitRequest(id, context, request.requestId); }
  @Post(':requestId/cancel') cancel(@Param('requestId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.cancelRequest(id, context, request.requestId); }
  @Post(':requestId/convert-to-package') @DurableIdempotency() convert(@Param('requestId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.convertRequest(id, context, request.requestId); }
}
