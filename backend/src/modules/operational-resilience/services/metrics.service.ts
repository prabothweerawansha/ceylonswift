import { Injectable } from '@nestjs/common';

type Labels = Record<string, string>;

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly durations = new Map<string, { count: number; totalMs: number; maxMs: number }>();

  increment(name: string, labels: Labels = {}, value = 1): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  observe(name: string, durationMs: number, labels: Labels = {}): void {
    const key = this.key(name, labels);
    const current = this.durations.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    this.durations.set(key, current);
  }

  snapshot(databaseHealthy: boolean): object {
    return {
      counters: Object.fromEntries(this.counters),
      durations: Object.fromEntries([...this.durations].map(([key, item]) => [key, { count: item.count, averageMs: item.count ? Number((item.totalMs / item.count).toFixed(2)) : 0, maxMs: Number(item.maxMs.toFixed(2)) }])),
      gauges: { databaseHealthy: databaseHealthy ? 1 : 0 },
    };
  }

  private key(name: string, labels: Labels): string {
    const safe = Object.entries(labels)
      .filter(([key]) => ['method', 'route', 'status', 'outcome', 'job'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b));
    return safe.length ? `${name}{${safe.map(([key, value]) => `${key}=${value.slice(0, 100)}`).join(',')}}` : name;
  }
}
