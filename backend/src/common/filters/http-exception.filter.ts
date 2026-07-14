import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';

interface ErrorBody {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const body: ErrorBody =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : { message: typeof exceptionResponse === 'string' ? exceptionResponse : undefined };
    const validationMessages = Array.isArray(body.message) ? body.message : null;
    const isServerError = status >= 500;

    response.status(status).json({
      success: false,
      error: {
        code: body.code ?? this.defaultCode(status),
        message:
          isServerError
            ? 'The service could not complete the request.'
            : validationMessages
              ? 'The request contains invalid fields.'
              : (body.message ?? 'Unable to complete the request.'),
        details: isServerError ? null : (validationMessages ?? body.details ?? null),
      },
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private defaultCode(status: number): string {
    if (status === 400) return 'REQUEST_INVALID';
    if (status === 401) return 'AUTH_REQUIRED';
    if (status === 403) return 'ACCESS_DENIED';
    if (status === 404) return 'RESOURCE_NOT_FOUND';
    if (status === 409) return 'RESOURCE_CONFLICT';
    if (status === 429) return 'RATE_LIMITED';
    if (status === 503) return 'SERVICE_UNAVAILABLE';
    return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
  }
}
