import { Module } from '@nestjs/common';
import { AuditModule } from './modules/audit.module';
import { AuthModule } from './modules/auth.module';
import { FeedbackProcessModule } from './modules/feedback-process.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, FeedbackProcessModule, AuditModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
