import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  CreateFeedbackProcessDto,
  UpdateFeedbackProcessDto,
} from '../dto/feedback-process.dto';

const processSelection = {
  id: true,
  description: true,
  objective: true,
  startsAt: true,
  endsAt: true,
  criteria: true,
  observation: true,
  status: true,
  ownerId: true,
  participantId: true,
  participant: { select: { id: true, name: true, email: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedbackProcessSelect;

@Injectable()
export class FeedbackProcessService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.feedbackProcess.findMany({
      select: processSelection,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const process = await this.prisma.feedbackProcess.findUnique({
      where: { id },
      select: processSelection,
    });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    return process;
  }

  listParticipants() {
    return this.prisma.user.findMany({
      where: { role: 'TEAM_MEMBER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(ownerId: number, dto: CreateFeedbackProcessDto) {
    const status = 'DRAFT';
    const participantId = await this.validateParticipant(dto.participantId);
    const startsAt = this.normalizeDate(dto.startsAt, 'início');
    const endsAt = this.normalizeDate(dto.endsAt, 'término');
    this.validatePlan(status, dto.objective, startsAt, endsAt, dto.criteria);

    return this.prisma.feedbackProcess.create({
      data: {
        description: this.normalizeDescription(dto.description),
        objective: dto.objective.trim(),
        startsAt,
        endsAt,
        criteria: this.normalizeCriteria(dto.criteria),
        status,
        owner: { connect: { id: ownerId } },
        participant: { connect: { id: participantId } },
      },
      select: processSelection,
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
      dto.startsAt === undefined ? current.startsAt?.toISOString() : dto.startsAt,
      'início',
    );
    const endsAt = this.normalizeDate(
      dto.endsAt === undefined ? current.endsAt?.toISOString() : dto.endsAt,
      'término',
    );
    const criteria = dto.criteria ?? current.criteria;
    this.validatePlan(status, objective, startsAt, endsAt, criteria);

    return this.prisma.feedbackProcess.update({
      where: { id },
      data: {
        description:
          dto.description === undefined
            ? current.description
            : this.normalizeDescription(dto.description),
        objective: objective.trim(),
        startsAt,
        endsAt,
        criteria: this.normalizeCriteria(criteria),
        participant: { connect: { id: participantId } },
      },
      select: processSelection,
    });
  }

  async submitForValidation(id: number, actorId: number, actorRole: string) {
    const current = await this.findOne(id);
    this.ensureDraftEditable(current, actorId, actorRole);
    this.validatePlan(
      'SENT_FOR_VALIDATION',
      current.objective,
      current.startsAt,
      current.endsAt,
      current.criteria,
    );
    return this.prisma.feedbackProcess.update({
      where: { id },
      data: { status: 'SENT_FOR_VALIDATION' },
      select: processSelection,
    });
  }

  async approve(id: number) {
    const current = await this.findOne(id);
    if (current.status !== 'SENT_FOR_VALIDATION') {
      throw new BadRequestException(
        'Somente processos enviados para validação podem ser aprovados.',
      );
    }
    return this.prisma.feedbackProcess.update({
      where: { id },
      data: { status: 'PLANNED' },
      select: processSelection,
    });
  }

  async registerObservation(id: number, observation: string) {
    await this.findOne(id);
    return this.prisma.feedbackProcess.update({
      where: { id },
      data: { observation: this.normalizeObservation(observation) },
      select: processSelection,
    });
  }

  async requestAdjustments(id: number, observation: string) {
    const current = await this.findOne(id);
    if (current.status !== 'SENT_FOR_VALIDATION') {
      throw new BadRequestException(
        'Somente processos enviados para validação podem ter ajustes solicitados.',
      );
    }
    return this.prisma.feedbackProcess.update({
      where: { id },
      data: {
        observation: this.normalizeObservation(observation),
        status: 'DRAFT',
      },
      select: processSelection,
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.prisma.feedbackProcess.delete({ where: { id } });
    return { id };
  }

  private ensureDraftEditable(
    process: { status: string; ownerId: number },
    actorId: number,
    actorRole: string,
  ) {
    if (process.status !== 'DRAFT') {
      throw new BadRequestException('Somente rascunhos podem ser editados ou enviados.');
    }
    if (actorRole === 'ADMIN_LEADER' && process.ownerId !== actorId) {
      throw new ForbiddenException('Líderes só podem editar os próprios rascunhos.');
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
    const participant = await this.prisma.user.findFirst({
      where: { id: value as number, role: 'TEAM_MEMBER' },
      select: { id: true },
    });
    if (!participant) {
      throw new BadRequestException('O participante selecionado não existe.');
    }
    return participant.id;
  }

  private normalizeDate(value: string | Date | null | undefined, label: string) {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`A data de ${label} é inválida.`);
    }
    return date;
  }

  private normalizeCriteria(value?: string[]): string[] {
    if (value == null) return [];
    if (!Array.isArray(value) || value.some((criterion) => typeof criterion !== 'string')) {
      throw new BadRequestException('Os critérios devem ser textos.');
    }
    return [...new Set(value.map((criterion) => criterion.trim()).filter(Boolean))];
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
    if (status !== 'DRAFT' && status !== 'SENT_FOR_VALIDATION' && status !== 'PLANNED') {
      throw new BadRequestException('O status do processo é inválido.');
    }
    if (status !== 'DRAFT') {
      if (!startsAt || !endsAt) {
        throw new BadRequestException('Defina o início e o término do processo.');
      }
      if (startsAt > endsAt) {
        throw new BadRequestException('O término deve ocorrer após o início.');
      }
      if (this.normalizeCriteria(criteria).length === 0) {
        throw new BadRequestException('Adicione ao menos um critério de avaliação.');
      }
    }
  }
}