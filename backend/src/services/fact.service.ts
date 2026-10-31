import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FactRepository } from '../repositories/fact.repository';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import { UserRepository } from '../repositories/user.repository';
import { CreateFactDto, FactQueryDto } from '../dto/fact.dto';

export interface FactUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

@Injectable()
export class FactService {
  constructor(
    private readonly facts: FactRepository,
    private readonly sessions: FeedbackSessionRepository,
    private readonly users: UserRepository,
  ) {}

  async create(authorId: number, dto: CreateFactDto, files: FactUpload[] = []) {
    const description = dto.description?.trim();
    if (!description) {
      throw new BadRequestException('Informe uma descrição por texto.');
    }

    this.validateAttachments(files);
    const relations = await this.validateRelations(authorId, dto);

    return this.facts.create({
      description,
      author: { connect: { id: authorId } },
      ...relations,
      attachments: files.length
        ? {
            create: files.map((file) => ({
              originalName: file.originalname.trim(),
              mimeType: file.mimetype.toLowerCase(),
              size: file.size,
              content: Uint8Array.from(file.buffer),
            })),
          }
        : undefined,
    });
  }

  async downloadAttachment(
    viewerId: number,
    viewerRole: string,
    factId: number,
    attachmentId: number,
  ) {
    const viewer = await this.users.findById(viewerId);
    if (!viewer) throw new NotFoundException('Usuário não encontrado.');

    const attachment = await this.facts.findAttachmentForViewer(
      factId,
      attachmentId,
      viewerId,
      viewerRole,
      viewer.teamId,
    );
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');
    return attachment;
  }

  async list(viewerId: number, viewerRole: string) {
    const viewer = await this.users.findById(viewerId);
    if (!viewer) throw new NotFoundException('Usuário não encontrado.');

    return this.facts.listForViewer(viewerId, viewerRole, viewer.teamId);
  }

  async listAvailable(viewerId: number, viewerRole: string, dto: FactQueryDto) {
    const viewer = await this.users.findById(viewerId);
    if (!viewer) throw new NotFoundException('Usuário não encontrado.');

    const from = dto.from ? new Date(dto.from) : undefined;
    const to = dto.to ? new Date(dto.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final.',
      );
    }

    return this.facts.listAvailableForViewer(
      viewerId,
      viewerRole,
      viewer.teamId,
      {
        page: dto.page,
        pageSize: dto.pageSize,
        relatedUserId: dto.relatedUserId,
        from,
        to,
      },
    );
  }

  // The selection validates authorization, availability and the transaction
  // conflict in one application-level operation.
  // eslint-disable-next-line max-lines-per-function
  async selectForSession(
    actorId: number,
    actorRole: string,
    sessionId: number,
    factIds: number[],
  ) {
    if (actorRole !== 'ADMIN_LEADER') {
      throw new ForbiddenException(
        'Somente o líder responsável pode selecionar fatos para a sessão.',
      );
    }

    const session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundException('Sessão não encontrada.');
    if (session.process.ownerId !== actorId) {
      throw new ForbiddenException(
        'Líderes só podem selecionar fatos nas próprias sessões.',
      );
    }

    const actor = await this.users.findById(actorId);
    if (!actor) throw new NotFoundException('Usuário não encontrado.');

    const facts = await this.facts.findForSelection(
      factIds,
      actorId,
      actorRole,
      actor.teamId,
    );
    if (facts.length !== factIds.length) {
      throw new BadRequestException(
        'Um ou mais fatos não estão disponíveis para seleção.',
      );
    }
    if (
      facts.some(
        (fact) => fact.sessionId !== null && fact.sessionId !== sessionId,
      )
    ) {
      throw new BadRequestException(
        'Um ou mais fatos já estão associados a outra sessão.',
      );
    }

    try {
      return await this.facts.selectForSession(sessionId, factIds);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'FACT_SELECTION_CONFLICT'
      ) {
        throw new BadRequestException(
          'Um ou mais fatos deixaram de estar disponíveis para seleção.',
        );
      }
      throw error;
    }
  }

  private validateAttachments(files: FactUpload[]) {
    if (!Array.isArray(files)) {
      throw new BadRequestException('Os anexos enviados são inválidos.');
    }

    if (files.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(
        `É possível anexar no máximo ${MAX_ATTACHMENTS} arquivos.`,
      );
    }

    for (const file of files) {
      this.validateAttachment(file);
    }
  }

  private validateAttachment(file: FactUpload) {
    if (!this.hasValidAttachmentShape(file)) {
      throw new BadRequestException('O anexo enviado é inválido.');
    }

    if (!file.originalname.trim()) {
      throw new BadRequestException('O anexo enviado é inválido.');
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new BadRequestException('Cada anexo deve ter no máximo 10 MB.');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      throw new BadRequestException('O tipo de um dos anexos não é permitido.');
    }
  }

  private hasValidAttachmentShape(file: FactUpload) {
    return Boolean(
      file &&
      typeof file.originalname === 'string' &&
      typeof file.mimetype === 'string' &&
      typeof file.size === 'number' &&
      Number.isFinite(file.size) &&
      Buffer.isBuffer(file.buffer),
    );
  }

  private async validateRelations(authorId: number, dto: CreateFactDto) {
    const relations: {
      session?: { connect: { id: number } };
      relatedUser?: { connect: { id: number } };
    } = {};

    if (dto.sessionId != null) {
      const session = await this.sessions.findById(dto.sessionId);
      if (!session) throw new NotFoundException('Sessão não encontrada.');
      const { ownerId, participantId } = session.process;
      if (authorId !== ownerId && authorId !== participantId) {
        throw new ForbiddenException(
          'Você não pode registrar fatos nesta sessão.',
        );
      }
      relations.session = { connect: { id: dto.sessionId } };
    }

    if (dto.relatedUserId != null) {
      const relatedUser = await this.users.findById(dto.relatedUserId);
      if (!relatedUser) {
        throw new NotFoundException('Pessoa associada não encontrada.');
      }
      relations.relatedUser = { connect: { id: dto.relatedUserId } };
    }

    return relations;
  }
}
