import { HttpException } from '@nestjs/common';
import { WorkforceRateLimitService } from './workforce-rate-limit.service';

describe('WorkforceRateLimitService', () => {
  it('allows requests inside the window and blocks excess attempts', () => {
    const service = new WorkforceRateLimitService();
    service.consume('invite:user', 2, 60_000);
    service.consume('invite:user', 2, 60_000);
    expect(() => service.consume('invite:user', 2, 60_000)).toThrow(HttpException);
  });

  it('keeps counters isolated by operation key', () => {
    const service = new WorkforceRateLimitService();
    service.consume('invite:user-a', 1, 60_000);
    expect(() => service.consume('invite:user-b', 1, 60_000)).not.toThrow();
  });
});
