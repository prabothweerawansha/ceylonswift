import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records bounded labels and request durations without user identifiers', () => {
    const metrics = new MetricsService();
    metrics.increment('requests_total', { method: 'GET', route: '/packages', userId: 'must-not-appear' });
    metrics.observe('request_duration_ms', 12, { route: '/packages' });
    const snapshot = JSON.stringify(metrics.snapshot(true));
    expect(snapshot).toContain('requests_total');
    expect(snapshot).toContain('databaseHealthy');
    expect(snapshot).not.toContain('must-not-appear');
  });
});
