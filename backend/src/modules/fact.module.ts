import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module';
import { PrismaModule } from '../prisma.module';
import { FactController } from '../controllers/fact.controller';
import { FactRepository } from '../repositories/fact.repository';
import { FactService } from '../services/fact.service';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FactController],
  providers: [FactService, FactRepository, FeedbackSessionRepository],
})
export class FactModule {}
