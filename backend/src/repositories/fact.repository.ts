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

  listAvailableForViewer(
    viewerId: number,
    viewerRole: string,
    viewerTeamId: number | null,
    query: {
      page: number;
      pageSize: number;
      relatedUserId?: number;
      from?: Date;
      to?: Date;
    },
  ) {
    const viewerWhere = this.buildViewerWhere(
      viewerId,
      viewerRole,
      viewerTeamId,
    );
    const where: Prisma.FactWhereInput = {
      ...viewerWhere,
      sessionId: null,
      ...(query.relatedUserId !== undefined
        ? { relatedUserId: query.relatedUserId }
        : {}),
      ...(query.from || query.to
        ? {
            recordedAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.fact.count({ where }),
      this.prisma.fact.findMany({
        where,
        select: factSelection,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]).then(([total, items]) => ({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    }));
  }

  findForSelection(
    factIds: number[],
    viewerId: number,
    viewerRole: string,
    viewerTeamId: number | null,
  ) {
    return this.prisma.fact.findMany({
      where: {
        id: { in: factIds },
        ...this.buildViewerWhere(viewerId, viewerRole, viewerTeamId),
      },
      select: { id: true, sessionId: true },
    });
  }

  selectForSession(sessionId: number, factIds: number[]) {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.fact.updateMany({
        where: {
          id: { in: factIds },
          OR: [{ sessionId: null }, { sessionId }],
        },
        data: { sessionId },
      });

      if (updated.count !== factIds.length) {
        throw new Error('FACT_SELECTION_CONFLICT');
      }

      return transaction.fact.findMany({
        where: { id: { in: factIds } },
        select: factSelection,
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      });
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
