import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

export const TEST_PASSWORD = 'Senha@123';

// Sobe a aplicação completa, com o mesmo prefixo e a mesma validação do main.ts.
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

// Apaga os dados do sistema e cria um cenário conhecido: uma equipe, um RH,
// um líder e um membro. Só roda em banco de teste (ver global-setup.ts).
export async function resetDatabase(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "FeedbackProcess", "User", "Team" RESTART IDENTITY CASCADE',
  );

  const password = await bcrypt.hash(TEST_PASSWORD, 10);
  const team = await prisma.team.create({ data: { name: 'Equipe Teste' } });
  const createUser = (name: string, email: string, role: UserRole) =>
    prisma.user.create({
      data: { name, age: 30, email, password, role, teamId: team.id },
    });

  return {
    team,
    rh: await createUser('RH Teste', 'rh@teste.com', 'ADMIN_RH'),
    leader: await createUser('Líder Teste', 'lider@teste.com', 'ADMIN_LEADER'),
    member: await createUser('Membro Teste', 'membro@teste.com', 'TEAM_MEMBER'),
  };
}

type UserRole = 'ADMIN_RH' | 'ADMIN_LEADER' | 'TEAM_MEMBER';
