import { ConfigService } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { PrismaService } from '../src/database/prisma.service';
import { MaintenanceJobsService } from '../src/modules/operational-resilience/services/maintenance-jobs.service';
import { MetricsService } from '../src/modules/operational-resilience/services/metrics.service';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.MAINTENANCE_CONFIRM !== 'RUN_CONTROLLED_MAINTENANCE') throw new Error('Production maintenance requires explicit confirmation.');
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const jobs = new MaintenanceJobsService(prisma, new ConfigService(configuration()), new MetricsService());
    const results = await jobs.runAll();
    console.log(JSON.stringify(results));
  } finally { await prisma.$disconnect(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? (process.env.NODE_ENV === 'development' ? error.stack : error.message) : 'Maintenance failed.'); process.exitCode = 1; });
