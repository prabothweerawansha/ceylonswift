import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MaintenanceJobsService } from '../src/modules/operational-resilience/services/maintenance-jobs.service';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.MAINTENANCE_CONFIRM !== 'RUN_CONTROLLED_MAINTENANCE') throw new Error('Production maintenance requires explicit confirmation.');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try { const results = await app.get(MaintenanceJobsService).runAll(); console.log(JSON.stringify(results)); }
  finally { await app.close(); }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Maintenance failed.'); process.exitCode = 1; });
