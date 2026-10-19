import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { FeedbackSessionController } from '../controllers/feedback-session.controller';
import { RolesGuard } from '../guards/roles.guard';
import { FeedbackSessionService } from '../services/feedback-session.service';
import { PrismaModule } from '../prisma.module';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FeedbackSessionController],
  providers: [
    FeedbackSessionService,
    FeedbackSessionRepository,
    FeedbackProcessRepository,
    RolesGuard,
  ],
})
export class FeedbackSessionModule {}
