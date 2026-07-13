import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AssignmentsController } from './controllers/assignments.controller';
import { CustomerRequestsController } from './controllers/customer-requests.controller';
import { HubsController } from './controllers/hubs.controller';
import { PackagesController } from './controllers/packages.controller';
import { PricingController } from './controllers/pricing.controller';
import { TrackingController } from './controllers/tracking.controller';
import { OperationsRateLimitService } from './services/operations-rate-limit.service';
import { OperationsService } from './services/operations.service';
import { PackageTransitionService } from './services/package-transition.service';
import { PricingService } from './services/pricing.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [CustomerRequestsController, PackagesController, TrackingController, AssignmentsController, HubsController, PricingController],
  providers: [OperationsService, PricingService, PackageTransitionService, OperationsRateLimitService],
})
export class OperationsModule {}

