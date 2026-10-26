import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export const factSelection = {
  id: true,
  authorId: true,
  sessionId: true,
  relatedUserId: true,
  description: true,
  recordedAt: true,
  attachments: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FactSelect;

@Injectable()
export class FactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FactCreateInput) {
    return this.prisma.fact.create({ data, select: factSelection });
  }

  findAttachmentForAuthor(
    factId: number,
    attachmentId: number,
    authorId: number,
  ) {
    return this.prisma.factAttachment.findFirst({
      where: {
        id: attachmentId,
        factId,
        fact: { authorId },
      },
      select: {
        originalName: true,
        mimeType: true,
        content: true,
      },
    });
  }
}
