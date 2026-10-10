import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findTeamMember(id: number) {
    return this.prisma.user.findFirst({
      where: { id, role: 'TEAM_MEMBER' },
      select: { id: true },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  createManaged(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        age: true,
        email: true,
        role: true,
        teamId: true,
      },
    });
  }

  listManaged() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        age: true,
        email: true,
        role: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });
  }

  listParticipants() {
    return this.prisma.user.findMany({
      where: { role: 'TEAM_MEMBER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  countByRole(role: User['role']) {
    return this.prisma.user.count({ where: { role } });
  }

  countByTeam(teamId: number) {
    return this.prisma.user.count({ where: { teamId } });
  }

  async deleteManaged(id: number, actorId: number) {
    return this.prisma.$transaction(
      async (transaction) => {
        const user = await transaction.user.findUnique({ where: { id } });
        if (!user) return null;
        if (user.id === actorId) return { error: 'SELF' as const };
        if (user.role === 'ADMIN_RH') {
          const adminCount = await transaction.user.count({
            where: { role: 'ADMIN_RH' },
          });
          if (adminCount <= 1) return { error: 'LAST_ADMIN' as const };
        }
        await transaction.user.delete({ where: { id } });
        return { deleted: true as const };
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
