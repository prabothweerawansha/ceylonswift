import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { DurableIdempotencyInterceptor } from '../interceptors/durable-idempotency.interceptor';

export const DurableIdempotency = (): MethodDecorator => applyDecorators(UseInterceptors(DurableIdempotencyInterceptor));
