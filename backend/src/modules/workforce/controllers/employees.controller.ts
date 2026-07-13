import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { BranchAssignmentDto, DirectoryQueryDto, EmployeeStatusDto, EmployeeUpdateDto } from '../dto/workforce.dto';
import { WorkforceService } from '../services/workforce.service';

@Controller('employees') @UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly service: WorkforceService) {}
  @Get() @RequirePermissions('staff.read') list(@Query() query: DirectoryQueryDto, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.employees(query, context); }
  @Get(':employeeId') @RequirePermissions('staff.read') get(@Param('employeeId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.employee(id, context); }
  @Patch(':employeeId') @RequirePermissions('staff.suspend') update(@Param('employeeId') id: string, @Body() dto: EmployeeUpdateDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.updateEmployee(id, dto, context, request.requestId); }
  @Patch(':employeeId/status') @RequirePermissions('staff.suspend') status(@Param('employeeId') id: string, @Body() dto: EmployeeStatusDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setEmployeeStatus(id, dto, context, request.requestId); }
  @Patch(':employeeId/branch') @RequirePermissions('branch.manage') branch(@Param('employeeId') id: string, @Body() dto: BranchAssignmentDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.setEmployeeBranch(id, dto, context, request.requestId); }
}
