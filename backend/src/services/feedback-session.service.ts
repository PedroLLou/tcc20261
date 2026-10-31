import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import {
  CreateFeedbackSessionDto,
  DefineFeedbackSessionObjectiveDto,
  DefineFeedbackSessionScheduleDto,
} from '../dto/feedback-session.dto';
import { FactQueryDto } from '../dto/fact.dto';
import { FactService } from './fact.service';

@Injectable()
export class FeedbackSessionService {
  constructor(
    private readonly sessions: FeedbackSessionRepository,
    private readonly processes: FeedbackProcessRepository,
    private readonly facts: FactService,
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

  async defineObjective(
    id: number,
    ownerId: number,
    dto: DefineFeedbackSessionObjectiveDto,
  ) {
    const session = await this.sessions.findById(id);
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.process.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Líderes só podem definir o objetivo das sessões dos próprios processos.',
      );
    }

    const objective = dto.objective.trim();
    if (!objective) {
      throw new BadRequestException('Informe o objetivo da sessão.');
    }
    if (objective.length > 500) {
      throw new BadRequestException(
        'O objetivo deve ter no máximo 500 caracteres.',
      );
    }

    return this.sessions.update(id, { objective });
  }

  async defineSchedule(
    id: number,
    ownerId: number,
    dto: DefineFeedbackSessionScheduleDto,
  ) {
    const session = await this.sessions.findById(id);
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.process.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Líderes só podem definir a data das sessões dos próprios processos.',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Informe uma data e um horário válidos.');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'A data e o horário da sessão não podem estar no passado.',
      );
    }

    return this.sessions.update(id, { scheduledAt });
  }

  async listAvailableFacts(
    sessionId: number,
    viewerId: number,
    viewerRole: string,
    dto: FactQueryDto,
  ) {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (
      viewerRole !== 'ADMIN_RH' &&
      viewerId !== session.process.ownerId &&
      viewerId !== session.process.participantId
    ) {
      throw new ForbiddenException(
        'Você não pode consultar fatos desta sessão.',
      );
    }
    return this.facts.listAvailable(viewerId, viewerRole, dto);
  }

  selectFacts(
    actorId: number,
    actorRole: string,
    sessionId: number,
    factIds: number[],
  ) {
    return this.facts.selectForSession(actorId, actorRole, sessionId, factIds);
  }
}
