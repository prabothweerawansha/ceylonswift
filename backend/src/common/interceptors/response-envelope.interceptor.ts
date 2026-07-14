import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { RequestWithId } from '../types/request-with-id';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    return next.handle().pipe(map((data) => ({ success: true, data, requestId: request.requestId, timestamp: new Date().toISOString() })));
  }
}
