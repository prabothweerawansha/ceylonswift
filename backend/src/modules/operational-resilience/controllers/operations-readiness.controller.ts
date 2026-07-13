import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaHealthIndicator } from '../../../database/prisma-health.indicator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import { MaintenanceJobsService } from '../services/maintenance-jobs.service';
import { MetricsService } from '../services/metrics.service';

@Controller('internal')
@UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
@RequirePermissions('audit.read')
export class OperationsReadinessController {
  constructor(private readonly metrics: MetricsService, private readonly health: PrismaHealthIndicator, private readonly jobs: MaintenanceJobsService) {}
  @Get('metrics') async getMetrics() { return this.metrics.snapshot(await this.health.check()); }
  @Get('jobs/runs') runs(@Query('limit') limit?: string) { return this.jobs.recentRuns(limit ? Number(limit) : 50); }
  @Post('jobs/run-maintenance') run() { return this.jobs.runAll(); }
}
