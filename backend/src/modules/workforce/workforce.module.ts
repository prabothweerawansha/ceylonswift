import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ApprovalsController } from './controllers/approvals.controller';
import { EmployeesController } from './controllers/employees.controller';
import { InvitationAcceptanceController, InvitationsController } from './controllers/invitations.controller';
import { RidersController } from './controllers/riders.controller';
import { UsersController } from './controllers/users.controller';
import { WorkforceRateLimitService } from './services/workforce-rate-limit.service';
import { WorkforceService } from './services/workforce.service';
import { InvitationDeliveryService } from './services/invitation-delivery.service';

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [UsersController, EmployeesController, RidersController, InvitationsController, InvitationAcceptanceController, ApprovalsController], providers: [WorkforceService, WorkforceRateLimitService, InvitationDeliveryService] })
export class WorkforceModule {}
