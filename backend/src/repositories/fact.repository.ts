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

  listForViewer(
    viewerId: number,
    viewerRole: string,
    viewerTeamId: number | null,
  ) {
    const where = this.buildViewerWhere(viewerId, viewerRole, viewerTeamId);

    return this.prisma.fact.findMany({
      where,
      select: factSelection,
      orderBy: { recordedAt: 'desc' },
    });
  }

  findAttachmentForViewer(
    factId: number,
    attachmentId: number,
    viewerId: number,
    viewerRole: string,
    viewerTeamId: number | null,
  ) {
    const factWhere = this.buildViewerWhere(viewerId, viewerRole, viewerTeamId);

    return this.prisma.factAttachment.findFirst({
      where: {
        id: attachmentId,
        factId,
        fact: factWhere,
      },
      select: {
        originalName: true,
        mimeType: true,
        content: true,
      },
    });
  }

  private buildViewerWhere(
    viewerId: number,
    viewerRole: string,
    viewerTeamId: number | null,
  ): Prisma.FactWhereInput {
    if (viewerRole === 'ADMIN_RH') {
      return {};
    }

    return {
      OR: [
        { authorId: viewerId },
        ...(viewerRole === 'ADMIN_LEADER' && viewerTeamId !== null
          ? [{ author: { teamId: viewerTeamId } }]
          : []),
      ],
    };
  }
}
