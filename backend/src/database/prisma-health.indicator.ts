import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  check(): Promise<boolean> {
    return this.prisma.isHealthy();
  }
}
