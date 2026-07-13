import { HttpException } from '@nestjs/common';
import { OperationsRateLimitService } from './operations-rate-limit.service';

describe('OperationsRateLimitService', () => {
  it('rate limits repeated public tracking lookups without mixing keys', () => {
    const service = new OperationsRateLimitService();
    service.consume('tracking:a', 1, 60_000);
    expect(() => service.consume('tracking:a', 1, 60_000)).toThrow(HttpException);
    expect(() => service.consume('tracking:b', 1, 60_000)).not.toThrow();
  });
});

