import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';

const validRequestId = /^[A-Za-z0-9._:-]{8,128}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const supplied = request.header('x-request-id');
    request.requestId = supplied && validRequestId.test(supplied) ? supplied : randomUUID();
    response.setHeader('x-request-id', request.requestId);
    next();
  }
}
