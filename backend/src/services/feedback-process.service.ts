import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  CreateFeedbackProcessDto,
  UpdateFeedbackProcessDto,
} from '../dto/feedback-process.dto';
import type { FeedbackProcess } from '../models/feedback-process.model';
import { withOperationSpan } from '../observability/operations';

@Injectable()
export class FeedbackProcessService {
  constructor(
    private readonly processes: FeedbackProcessRepository,
    private readonly users: UserRepository,
  ) {}

  list(): Promise<FeedbackProcess[]> {
    return this.processes.list();
  }

  async findOne(id: number): Promise<FeedbackProcess> {
    const process = await this.processes.findById(id);
    if (!process) throw new NotFoundException('Processo não encontrado.');
    return process;
  }

  listParticipants() {
    return this.users.listParticipants();
  }

  async create(ownerId: number, dto: CreateFeedbackProcessDto) {
    return withOperationSpan('feedback.create', async () => {
      const status = 'DRAFT';
      const participantId = await this.validateParticipant(dto.participantId);
      const startsAt = this.normalizeDate(dto.startsAt, 'início');
      const endsAt = this.normalizeDate(dto.endsAt, 'término');
      this.validatePlan(status, dto.objective, startsAt, endsAt, dto.criteria);

      return this.processes.create({
        description: this.normalizeDescription(dto.description),
        objective: dto.objective.trim(),
        startsAt,
        endsAt,
        criteria: this.normalizeCriteria(dto.criteria),
        status,
        owner: { connect: { id: ownerId } },
        participant: { connect: { id: participantId } },
      });
    });
  }

  async update(
    id: number,
    dto: UpdateFeedbackProcessDto,
    actorId: number,
    actorRole: string,
  ) {
    const current = await this.findOne(id);
    this.ensureDraftEditable(current, actorId, actorRole);
    const status = current.status;
    const objective = dto.objective ?? current.objective;
    const participantId = await this.validateParticipant(
      dto.participantId ?? current.participantId,
    );
    const startsAt = this.normalizeDate(
      dto.startsAt === undefined
        ? current.startsAt?.toISOString()
        : dto.startsAt,
      'início',
    );
    const endsAt = this.normalizeDate(
      dto.endsAt === undefined ? current.endsAt?.toISOString() : dto.endsAt,
      'término',
    );
    const criteria = dto.criteria ?? current.criteria;
    this.validatePlan(status, objective, startsAt, endsAt, criteria);

    return this.processes.update(id, {
      description:
        dto.description === undefined
          ? current.description
          : this.normalizeDescription(dto.description),
      objective: objective.trim(),
      startsAt,
      endsAt,
      criteria: this.normalizeCriteria(criteria),
      participant: { connect: { id: participantId } },
    });
  }

  async submitForValidation(id: number, actorId: number, actorRole: string) {
    return withOperationSpan('feedback.submit_for_validation', async () => {
      const current = await this.findOne(id);
      this.ensureDraftEditable(current, actorId, actorRole);
      this.validatePlan(
        'SENT_FOR_VALIDATION',
        current.objective,
        current.startsAt,
        current.endsAt,
        current.criteria,
      );
      return this.processes.update(id, { status: 'SENT_FOR_VALIDATION' });
    });
  }

  async approve(id: number) {
    const current = await this.findOne(id);
    if (current.status !== 'SENT_FOR_VALIDATION') {
      throw new BadRequestException(
        'Somente processos enviados para validação podem ser aprovados.',
      );
    }
    return this.processes.update(id, { status: 'PLANNED' });
  }

  async registerObservation(id: number, observation: string) {
    await this.findOne(id);
    return this.processes.update(id, {
      observation: this.normalizeObservation(observation),
    });
  }

  async requestAdjustments(id: number, observation: string) {
    const current = await this.findOne(id);
    if (current.status !== 'SENT_FOR_VALIDATION') {
      throw new BadRequestException(
        'Somente processos enviados para validação podem ter ajustes solicitados.',
      );
    }
    return this.processes.update(id, {
      observation: this.normalizeObservation(observation),
      status: 'DRAFT',
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.processes.delete(id);
    return { id };
  }

  private ensureDraftEditable(
    process: { status: string; ownerId: number },
    actorId: number,
    actorRole: string,
  ) {
    if (process.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente rascunhos podem ser editados ou enviados.',
      );
    }
    if (actorRole === 'ADMIN_LEADER' && process.ownerId !== actorId) {
      throw new ForbiddenException(
        'Líderes só podem editar os próprios rascunhos.',
      );
    }
  }

  private normalizeDescription(value?: string | null): string | null {
    if (value == null) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException('A descrição deve ser um texto.');
    }
    if (value.trim() === '') return null;
    const description = value.trim();
    if (description.length > 1000) {
      throw new BadRequestException(
        'A descrição deve ter no máximo 1000 caracteres.',
      );
    }
    return description;
  }

  private normalizeObservation(value: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('Informe uma observação.');
    }
    const observation = value.trim();
    if (observation.length > 2000) {
      throw new BadRequestException(
        'A observação deve ter no máximo 2000 caracteres.',
      );
    }
    return observation;
  }

  private async validateParticipant(value?: number | null): Promise<number> {
    if (!Number.isInteger(value)) {
      throw new BadRequestException('Selecione um membro da equipe.');
    }
    const participant = await this.users.findTeamMember(value as number);
    if (!participant) {
      throw new BadRequestException('O participante selecionado não existe.');
    }
    return participant.id;
  }

  private normalizeDate(
    value: string | Date | null | undefined,
    label: string,
  ) {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`A data de ${label} é inválida.`);
    }
    return date;
  }

  private normalizeCriteria(value?: string[]): string[] {
    if (value == null) return [];
    if (
      !Array.isArray(value) ||
      value.some((criterion) => typeof criterion !== 'string')
    ) {
      throw new BadRequestException('Os critérios devem ser textos.');
    }
    return [
      ...new Set(value.map((criterion) => criterion.trim()).filter(Boolean)),
    ];
  }

  private validatePlan(
    status: string,
    objective: string,
    startsAt: Date | null,
    endsAt: Date | null,
    criteria?: string[],
  ) {
    if (typeof objective !== 'string' || !objective.trim()) {
      throw new BadRequestException('O objetivo do processo é obrigatório.');
    }
    if (!this.isKnownStatus(status)) {
      throw new BadRequestException('O status do processo é inválido.');
    }
    if (status !== 'DRAFT') {
      if (!startsAt || !endsAt) {
        throw new BadRequestException(
          'Defina o início e o término do processo.',
        );
      }
      if (startsAt > endsAt) {
        throw new BadRequestException('O término deve ocorrer após o início.');
      }
      if (this.normalizeCriteria(criteria).length === 0) {
        throw new BadRequestException(
          'Adicione ao menos um critério de avaliação.',
        );
      }
    }
  }

  private isKnownStatus(status: string): boolean {
    return ['DRAFT', 'SENT_FOR_VALIDATION', 'PLANNED'].includes(status);
  }
}
