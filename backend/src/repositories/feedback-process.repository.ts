import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export const feedbackProcessSelection = {
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
export class FeedbackProcessRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.feedbackProcess.findMany({
      select: feedbackProcessSelection,
      orderBy: { updatedAt: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.feedbackProcess.findUnique({
      where: { id },
      select: feedbackProcessSelection,
    });
  }

  create(data: Prisma.FeedbackProcessCreateInput) {
    return this.prisma.feedbackProcess.create({
      data,
      select: feedbackProcessSelection,
    });
  }

  update(id: number, data: Prisma.FeedbackProcessUpdateInput) {
    return this.prisma.feedbackProcess.update({
      where: { id },
      data,
      select: feedbackProcessSelection,
    });
  }

  delete(id: number) {
    return this.prisma.feedbackProcess.delete({ where: { id } });
  }
}
