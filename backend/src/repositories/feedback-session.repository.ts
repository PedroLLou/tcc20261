import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export const feedbackSessionSelection = {
  id: true,
  processId: true,
  objective: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FeedbackSessionSelect;

@Injectable()
export class FeedbackSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.FeedbackSessionCreateInput) {
    return this.prisma.feedbackSession.create({
      data,
      select: feedbackSessionSelection,
    });
  }

  findById(id: number) {
    return this.prisma.feedbackSession.findUnique({
      where: { id },
      select: {
        ...feedbackSessionSelection,
        process: {
          select: {
            ownerId: true,
            participantId: true,
          },
        },
      },
    });
  }

  update(id: number, data: Prisma.FeedbackSessionUpdateInput) {
    return this.prisma.feedbackSession.update({
      where: { id },
      data,
      select: feedbackSessionSelection,
    });
  }
}
