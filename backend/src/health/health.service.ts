import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaHealthIndicator } from '../database/prisma-health.indicator';

export interface HealthData {
  status: 'ok';
  database: 'connected';
  timestamp: string;
  environment: string;
  version: string;
}

export interface ReadinessData { status: 'ready'; database: 'connected'; configuration: 'valid'; backgroundJobs: 'enabled' | 'development-disabled'; timestamp: string }

@Injectable()
export class HealthService {
  constructor(
    private readonly databaseHealth: PrismaHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  async getHealth(): Promise<HealthData> {
    if (!(await this.databaseHealth.check())) {
      throw new ServiceUnavailableException({
        code: 'HEALTH_DATABASE_UNAVAILABLE',
        message: 'Database connectivity check failed.',
        details: null,
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: this.config.get<string>('nodeEnv', 'development'),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  getLiveness(): { status: 'alive'; timestamp: string } { return { status: 'alive', timestamp: new Date().toISOString() }; }

  async getReadiness(): Promise<ReadinessData> {
    if (!(await this.databaseHealth.check())) throw new ServiceUnavailableException({ code: 'READINESS_DATABASE_UNAVAILABLE', message: 'The service is not ready.', details: null });
    const production = this.config.get<string>('nodeEnv') === 'production';
    const jobsEnabled = this.config.get<boolean>('jobs.enabled', false);
    if (production && !jobsEnabled) throw new ServiceUnavailableException({ code: 'READINESS_JOBS_UNAVAILABLE', message: 'The service is not ready.', details: null });
    return { status: 'ready', database: 'connected', configuration: 'valid', backgroundJobs: jobsEnabled ? 'enabled' : 'development-disabled', timestamp: new Date().toISOString() };
  }
}
