import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateFeedbackProcessDto } from '../dto/feedback-process.dto';

const processSelection = {
  id: true,
  title: true,
  description: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedbackProcessSelect;

@Injectable()
export class FeedbackProcessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: number, dto: CreateFeedbackProcessDto) {
    return this.prisma.feedbackProcess.create({
      data: {
        title: this.normalizeTitle(dto.title),
        description: this.normalizeDescription(dto.description),
        owner: { connect: { id: ownerId } },
      },
      select: processSelection,
    });
  }

  private normalizeTitle(value: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('O nome do processo é obrigatório.');
    }
    const title = value.trim();
    if (title.length > 120) {
      throw new BadRequestException('O nome deve ter no máximo 120 caracteres.');
    }
    return title;
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
}