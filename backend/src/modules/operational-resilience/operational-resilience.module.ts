import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { HealthModule } from '../../health/health.module';
import { OperationsReadinessController } from './controllers/operations-readiness.controller';
import { DurableIdempotencyInterceptor } from './interceptors/durable-idempotency.interceptor';
import { IdempotencyService } from './services/idempotency.service';
import { MaintenanceJobsService } from './services/maintenance-jobs.service';
import { MetricsService } from './services/metrics.service';

@Global()
@Module({
  imports: [AuthModule, AuthorizationModule, HealthModule],
  controllers: [OperationsReadinessController],
  providers: [MetricsService, IdempotencyService, DurableIdempotencyInterceptor, MaintenanceJobsService],
  exports: [MetricsService, IdempotencyService, DurableIdempotencyInterceptor, MaintenanceJobsService],
})
export class OperationalResilienceModule {}
