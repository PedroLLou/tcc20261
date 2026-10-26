import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FactRepository } from '../repositories/fact.repository';
import { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import { UserRepository } from '../repositories/user.repository';
import { CreateFactDto } from '../dto/fact.dto';

export interface FactUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
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
    authorId: number,
    factId: number,
    attachmentId: number,
  ) {
    const attachment = await this.facts.findAttachmentForAuthor(
      factId,
      attachmentId,
      authorId,
    );
    if (!attachment) throw new NotFoundException('Anexo não encontrado.');
    return attachment;
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
      if (
        !file ||
        typeof file.originalname !== 'string' ||
        typeof file.mimetype !== 'string' ||
        typeof file.size !== 'number' ||
        !Number.isFinite(file.size) ||
        !Buffer.isBuffer(file.buffer)
      ) {
        throw new BadRequestException('O anexo enviado é inválido.');
      }

      if (!file.originalname.trim()) {
        throw new BadRequestException('O anexo enviado é inválido.');
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        throw new BadRequestException('Cada anexo deve ter no máximo 50 MB.');
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
        throw new BadRequestException(
          'O tipo de um dos anexos não é permitido.',
        );
      }
    }
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
