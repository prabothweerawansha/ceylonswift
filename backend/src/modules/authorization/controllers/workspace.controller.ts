import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentPrincipal } from '../../auth/decorators/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../../auth/types/authenticated-request';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { SelectWorkspaceDto } from '../dto/select-workspace.dto';
import { WorkspaceService } from '../services/workspace.service';

@Controller('auth/workspaces')
@UseGuards(AccessTokenGuard)
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}
  @Get()
  list(@CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.workspaces.list(principal.userId); }
  @Post('select')
  @HttpCode(200)
  select(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() dto: SelectWorkspaceDto, @Req() request: RequestWithId) {
    return this.workspaces.select(principal.userId, principal.sessionId, dto.workspaceId, request.requestId);
  }
}
