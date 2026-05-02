import { Injectable } from '@nestjs/common';
import { Person } from '@prisma/client';
import { PersonDto } from '../dto/person.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByEmail(email: string): Promise<boolean> {
    const person = await this.prisma.person.findUnique({ where: { email } });
    return !!person;
  }

  async create(dto: PersonDto): Promise<Person> {
    return this.prisma.person.create({
      data: {
        name: dto.name,
        age: dto.age,
        email: dto.email,
        password: dto.password,
      },
    });
  }

  async findAll(): Promise<Person[]> {
    return this.prisma.person.findMany();
  }

  async findOne(id: number): Promise<Person | null> {
    return this.prisma.person.findUnique({ where: { id } });
  }

  async update(id: number, dto: PersonDto): Promise<Person | null> {
    return this.prisma.person.update({
      where: { id },
      data: {
        name: dto.name,
        age: dto.age,
        email: dto.email,
        password: dto.password,
      },
    });
  }

  async remove(id: number): Promise<boolean> {
    try {
      await this.prisma.person.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
