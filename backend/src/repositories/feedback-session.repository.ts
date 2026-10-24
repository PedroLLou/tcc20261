import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export const feedbackSessionSelection = {
  id: true,
  processId: true,
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
}
