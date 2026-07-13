import { randomBytes } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';

const traceParent = /^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i;

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const supplied = request.header('traceparent')?.match(traceParent);
    request.traceId = this.config.get<boolean>('observability.tracingEnabled', true) && supplied?.[1] ? supplied[1].toLowerCase() : randomBytes(16).toString('hex');
    request.spanId = randomBytes(8).toString('hex');
    response.setHeader('traceparent', `00-${request.traceId}-${request.spanId}-01`);
    next();
  }
}
