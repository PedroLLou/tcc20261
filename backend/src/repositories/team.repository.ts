import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.team.findUnique({ where: { id } });
  }

  findByName(name: string) {
    return this.prisma.team.findUnique({ where: { name } });
  }

  list() {
    return this.prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  create(name: string) {
    return this.prisma.team.create({ data: { name } });
  }

  delete(id: number) {
    return this.prisma.team.delete({ where: { id } });
  }
}
