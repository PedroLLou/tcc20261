import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { FeedbackProcessController } from '../controllers/feedback-process.controller';
import { RolesGuard } from '../guards/roles.guard';
import { FeedbackProcessService } from '../services/feedback-process.service';

@Module({
  imports: [AuthModule],
  controllers: [FeedbackProcessController],
  providers: [FeedbackProcessService, RolesGuard],
})
export class FeedbackProcessModule {}