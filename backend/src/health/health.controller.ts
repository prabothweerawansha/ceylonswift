import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthData } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): Promise<HealthData> {
    return this.healthService.getHealth();
  }

  @Get('live') live() { return this.healthService.getLiveness(); }
  @Get('ready') ready() { return this.healthService.getReadiness(); }
}
