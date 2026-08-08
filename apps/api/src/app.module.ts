import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { IdentityModule } from './modules/identity/identity.module';
import { FamiliesModule } from './modules/families/families.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { StudentsModule } from './modules/students/students.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { CorrelationIdMiddleware } from './common/middleware';
import { GracefulShutdownService } from './common/graceful-shutdown';
import { ResponseMetadataInterceptor } from './common/response-metadata.interceptor';
import { QueueModule } from './infrastructure/queue/queue.module';
import { LoggingModule } from './common/logging.module';
import { InAppNotificationModule } from './infrastructure/notifications/in-app-notification.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SmsModule } from './infrastructure/sms/sms.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';

@Module({
  imports: [
    LoggingModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ConfigModule,
    DatabaseModule,
    SmsModule,
    InAppNotificationModule,
    IdentityModule,
    FamiliesModule,
    SchoolsModule,
    StudentsModule,
    RegistrationsModule,
    PricingModule,
    ContractsModule,
    InstallmentsModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    BroadcastsModule,
    HealthModule,
    QueueModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseMetadataInterceptor },
    GracefulShutdownService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
