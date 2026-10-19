import { Module } from '@nestjs/common';
import { AuditModule } from './modules/audit.module';
import { AuthModule } from './modules/auth.module';
import { FeedbackProcessModule } from './modules/feedback-process.module';
import { FeedbackSessionModule } from './modules/feedback-session.module';
import { PrismaModule } from './prisma.module';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptions } from './observability/logger';
import { HealthController } from './observability/health.controller';
import { DatabaseReadiness } from './observability/database-readiness';

@Module({
  imports: [
    LoggerModule.forRoot(loggerOptions),
    PrismaModule,
    AuthModule,
    FeedbackProcessModule,
    FeedbackSessionModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseReadiness],
})
export class AppModule {}
