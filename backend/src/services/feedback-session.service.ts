import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import { CreateFeedbackSessionDto } from '../dto/feedback-session.dto';

@Injectable()
export class FeedbackSessionService {
  constructor(
    private readonly sessions: FeedbackSessionRepository,
    private readonly processes: FeedbackProcessRepository,
  ) {}

  async create(ownerId: number, dto: CreateFeedbackSessionDto) {
    const process = await this.processes.findById(dto.processId);
    if (!process) throw new NotFoundException('Processo não encontrado.');
    if (process.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Líderes só podem criar sessões nos próprios processos.',
      );
    }
    if (process.status !== 'PLANNED') {
      throw new BadRequestException(
        'Somente processos planejados podem receber sessões.',
      );
    }

    return this.sessions.create({ process: { connect: { id: process.id } } });
  }
}
