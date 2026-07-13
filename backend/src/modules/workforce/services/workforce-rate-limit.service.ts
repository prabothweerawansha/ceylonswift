import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface Bucket { count: number; resetAt: number }

@Injectable()
export class WorkforceRateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  consume(key: string, limit = 20, windowMs = 60_000): void {
    const now = Date.now(); const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) { this.buckets.set(key, { count: 1, resetAt: now + windowMs }); return; }
    current.count += 1;
    if (current.count > limit) throw new HttpException({ code: 'WORKFORCE_RATE_LIMITED', message: 'Too many workforce management requests.', details: null }, HttpStatus.TOO_MANY_REQUESTS);
  }
  clear(): void { this.buckets.clear(); }
}

