import { Controller, Get, Param } from '@nestjs/common';
import { OperationsService } from '../services/operations.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly operations: OperationsService) {}
  @Get(':trackingCode') get(@Param('trackingCode') trackingCode: string) { return this.operations.publicTracking(trackingCode); }
}

