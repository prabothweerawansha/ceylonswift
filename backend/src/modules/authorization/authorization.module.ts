import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsController } from './controllers/organizations.controller';
import { RolesController } from './controllers/roles.controller';
import { WorkspaceController } from './controllers/workspace.controller';
import { BranchScopeGuard } from './guards/branch-scope.guard';
import { CapabilitiesController } from './controllers/capabilities.controller';
import { OrganizationScopeGuard } from './guards/organization-scope.guard';
import { PermissionGuard } from './guards/permission.guard';
import { StepUpGuard } from './guards/step-up.guard';
import { WorkspaceGuard } from './guards/workspace.guard';
import { OrganizationAccessService } from './services/organization-access.service';
import { PermissionResolverService } from './services/permission-resolver.service';
import { ResourceOwnershipPolicyService } from './services/resource-ownership-policy.service';
import { RoleAssignmentService } from './services/role-assignment.service';
import { StepUpPolicyService } from './services/step-up-policy.service';
import { WorkspaceService } from './services/workspace.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController, CapabilitiesController, RolesController, OrganizationsController],
  providers: [PermissionResolverService, WorkspaceService, RoleAssignmentService, OrganizationAccessService, ResourceOwnershipPolicyService, StepUpPolicyService, WorkspaceGuard, PermissionGuard, StepUpGuard, OrganizationScopeGuard, BranchScopeGuard],
  exports: [PermissionResolverService, ResourceOwnershipPolicyService, StepUpPolicyService, WorkspaceGuard, PermissionGuard, StepUpGuard, OrganizationScopeGuard, BranchScopeGuard],
})
export class AuthorizationModule {}
