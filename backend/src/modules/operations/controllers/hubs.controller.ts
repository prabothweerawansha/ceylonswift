import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { HubCreateDto, HubQueryDto, HubStatusDto, HubUpdateDto } from '../dto/operations.dto';
import { OperationsService } from '../services/operations.service';

@Controller('hubs')
export class HubsController {
  constructor(private readonly operations: OperationsService) {}
  @Get() list(@Query() query: HubQueryDto) { return this.operations.hubs(query); }
  @Get(':hubId') get(@Param('hubId') id: string) { return this.operations.hub(id); }
  @Post() @UseGuards(AccessTokenGuard, WorkspaceGuard) create(@Body() dto: HubCreateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.createHub(dto, context, request.requestId); }
  @Patch(':hubId') @UseGuards(AccessTokenGuard, WorkspaceGuard) update(@Param('hubId') id: string, @Body() dto: HubUpdateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.updateHub(id, dto, context, request.requestId); }
  @Patch(':hubId/status') @UseGuards(AccessTokenGuard, WorkspaceGuard) status(@Param('hubId') id: string, @Body() dto: HubStatusDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.operations.setHubStatus(id, dto, context, request.requestId); }
}

