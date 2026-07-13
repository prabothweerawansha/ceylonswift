import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { OperationsService } from '../services/operations.service';

@UseGuards(AccessTokenGuard, WorkspaceGuard)
@Controller()
export class AssignmentsController {
  constructor(private readonly operations: OperationsService) {}
  @Get('riders/:riderId/assignments') rider(@Param('riderId') riderId: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.riderAssignments(riderId, context); }
  @Get('me/rider/assignments') mine(@CurrentAuthorizationContext() context: AuthorizationContext) { return this.operations.myRiderAssignments(context); }
}
