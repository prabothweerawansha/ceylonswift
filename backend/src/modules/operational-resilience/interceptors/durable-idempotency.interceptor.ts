import { BadRequestException, CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { from, lastValueFrom, type Observable } from 'rxjs';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { IdempotencyService } from '../services/idempotency.service';

@Injectable()
export class DurableIdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const authorization = request.authorization;
    if (!authorization) throw new BadRequestException({ code: 'IDEMPOTENCY_CONTEXT_MISSING', message: 'The workspace context is required.', details: null });
    const key = request.header('idempotency-key') ?? '';
    const endpoint = request.path;
    return from(this.idempotency.execute<unknown>({ key, method: request.method, endpoint, body: request.body, params: request.params, context: authorization }, response.statusCode, () => lastValueFrom(next.handle())).then((result): unknown => {
      if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');
      if (result.statusCode) response.status(result.statusCode);
      return result.value;
    }));
  }
}
