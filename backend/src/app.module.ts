import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth.module';
import { FeedbackProcessModule } from './modules/feedback-process.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, FeedbackProcessModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
