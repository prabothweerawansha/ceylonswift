import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import pino, { type Logger } from 'pino';
import { createHash } from 'node:crypto';
import type { AuthenticatedRequest } from '../../modules/auth/types/authenticated-request';
import { MetricsService } from '../../modules/operational-resilience/services/metrics.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger: Logger;

  private readonly service: string;
  private readonly environment: string;
  private readonly version: string;

  constructor(config: ConfigService, private readonly metrics: MetricsService) {
    this.service = config.get<string>('serviceName', 'ceylonswift-api');
    this.environment = config.get<string>('nodeEnv', 'development');
    this.version = config.get<string>('serviceVersion', '0.1.0');
    this.logger = pino({
      level: config.get<string>('logLevel', 'info'),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'passwordHash',
          'otp',
          'token',
          'refreshToken',
          'accessToken',
          'recoveryCode',
          'clientSecret',
          '*.password',
          '*.otp',
          '*.token',
          '*.phone',
          '*.address',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  use(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const matchedRoute = request.route as unknown as { path?: unknown } | undefined;
      const route = typeof matchedRoute?.path === 'string' ? `${request.baseUrl}${matchedRoute.path}` : 'unmatched';
      const status = String(response.statusCode);
      const outcome = response.statusCode < 400 ? 'success' : 'failure';
      this.metrics.increment('http_requests_total', { method: request.method, route, status, outcome });
      this.metrics.observe('http_request_duration_ms', durationMs, { method: request.method, route });
      if (route.includes('/auth/login') && response.statusCode >= 400) this.metrics.increment('authentication_failures_total');
      if (route.includes('/otp/') && response.statusCode >= 400) this.metrics.increment('otp_failures_total');
      if (route.includes('/tracking/')) this.metrics.increment('public_tracking_lookups_total', { outcome });
      if (request.method === 'POST' && route === '/api/v1/packages') this.metrics.increment('package_creations_total', { outcome });
      if (route.endsWith('/status')) this.metrics.increment('package_status_transitions_total', { outcome });
      if (route.endsWith('/assign') || route.endsWith('/reassign')) this.metrics.increment('package_assignments_total', { outcome });
      this.logger.info(
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          service: this.service,
          environment: this.environment,
          version: this.version,
          requestId: request.requestId,
          traceId: request.traceId,
          spanId: request.spanId,
          userId: request.principal?.userId ?? null,
          sessionId: request.principal?.sessionId ? createHash('sha256').update(request.principal.sessionId).digest('hex').slice(0, 16) : null,
          organizationId: request.authorization?.organizationId ?? null,
          branchId: request.authorization?.branchId ?? null,
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          errorCode: response.statusCode >= 400 ? `HTTP_${response.statusCode}` : null,
          outcome,
        },
        'request completed',
      );
    });
    next();
  }
}
