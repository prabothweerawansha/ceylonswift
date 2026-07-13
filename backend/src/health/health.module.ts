import { Module } from '@nestjs/common';
import { PrismaHealthIndicator } from '../database/prisma-health.indicator';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
