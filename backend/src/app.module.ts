import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { OperationsModule } from './modules/operations/operations.module';
import { OperationalResilienceModule } from './modules/operational-resilience/operational-resilience.module';
import { RequestTimeoutInterceptor } from './common/interceptors/request-timeout.interceptor';
import { TraceContextMiddleware } from './common/middleware/trace-context.middleware';
import { LandingPageModule } from './modules/landing-page/landing-page.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, HealthModule, AuthModule, AuthorizationModule, OperationalResilienceModule, WorkforceModule, OperationsModule, LandingPageModule],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestTimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, TraceContextMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
