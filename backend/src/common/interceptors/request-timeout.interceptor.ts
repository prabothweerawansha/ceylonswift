import { CallHandler, ExecutionContext, Injectable, RequestTimeoutException, type NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, throwError, timeout, TimeoutError, type Observable } from 'rxjs';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.config.get<number>('requestTimeoutMs', 15000)),
      catchError((error: unknown) => error instanceof TimeoutError
        ? throwError(() => new RequestTimeoutException({ code: 'REQUEST_TIMEOUT', message: 'The request timed out safely. Retry only when the operation supports it.', details: null }))
        : throwError(() => error)),
    );
  }
}
