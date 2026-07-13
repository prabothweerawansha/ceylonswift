import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class OperationsRateLimitService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  consume(key: string, maximum: number, windowMs: number): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    this.attempts.set(key, bucket);
    if (bucket.count > maximum) {
      throw new HttpException(
        { code: 'OPERATION_RATE_LIMITED', message: 'Please wait before trying again.', details: null },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

