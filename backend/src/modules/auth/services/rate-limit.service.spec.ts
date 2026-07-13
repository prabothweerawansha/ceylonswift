import { HttpException } from '@nestjs/common';
import { AuthRateLimitService } from './rate-limit.service';

describe('AuthRateLimitService', () => {
  it('enforces a temporary bucket and can be reset', () => {
    const service = new AuthRateLimitService();
    service.consume('key', 1, 60_000);
    expect(() => service.consume('key', 1, 60_000)).toThrow(HttpException);
    service.clear();
    expect(() => service.consume('key', 1, 60_000)).not.toThrow();
  });
});
