import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { FeedbackProcessController } from '../controllers/feedback-process.controller';
import { RolesGuard } from '../guards/roles.guard';
import { FeedbackProcessService } from '../services/feedback-process.service';
import { PrismaModule } from '../prisma.module';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FeedbackProcessController],
  providers: [FeedbackProcessService, FeedbackProcessRepository, RolesGuard],
})
export class FeedbackProcessModule {}
