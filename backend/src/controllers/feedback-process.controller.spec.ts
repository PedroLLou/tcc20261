import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { FeedbackProcessModule } from '../modules/feedback-process.module';
import { PrismaService } from '../prisma.service';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { UserRepository } from '../repositories/user.repository';

const originalSecret = process.env.JWT_SECRET;
const jwt = new JwtService({ secret: 'chave-ficticia-teste-exclusao' });
const processes = { findById: jest.fn(), delete: jest.fn() };
const users = { findById: jest.fn() };
let moduleRef: TestingModule;
let app: INestApplication<Server>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'chave-ficticia-teste-exclusao';
  moduleRef = await Test.createTestingModule({
    imports: [FeedbackProcessModule],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(UserRepository)
    .useValue(users)
    .overrideProvider(FeedbackProcessRepository)
    .useValue(processes)
    .compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
});

beforeEach(() => {
  jest.resetAllMocks();
  processes.findById.mockResolvedValue({
    id: 7,
    ownerId: 10,
    status: 'PLANNED',
  });
});

afterAll(async () => {
  if (app) await app.close();
  else if (moduleRef) await moduleRef.close();
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

function tokenFor(id: number, role: string) {
  users.findById.mockResolvedValue({ id, role });
  return jwt.sign({ sub: id, email: 'usuario@example.invalid', role });
}

it.each<[number, string]>([
  [10, 'ADMIN_LEADER'],
  [30, 'ADMIN_RH'],
])('permite a exclusão para o usuário %i (%s)', async (id, role) => {
  const token = tokenFor(id, role);

  await request(app.getHttpServer())
    .delete('/api/v1/feedback-processes/7')
    .set('Authorization', `Bearer ${token}`)
    .expect(200, { id: 7 });
  expect(processes.delete).toHaveBeenCalledWith(7);
});

it('retorna 403 para outro líder mesmo com identidade forjada no corpo', async () => {
  const token = tokenFor(20, 'ADMIN_LEADER');

  await request(app.getHttpServer())
    .delete('/api/v1/feedback-processes/7')
    .set('Authorization', `Bearer ${token}`)
    .send({ actorId: 10, actorRole: 'ADMIN_RH' })
    .expect(403);
  expect(processes.delete).not.toHaveBeenCalled();
});

it('preserva o 404 para processo inexistente', async () => {
  const token = tokenFor(10, 'ADMIN_LEADER');
  processes.findById.mockResolvedValue(null);

  await request(app.getHttpServer())
    .delete('/api/v1/feedback-processes/99')
    .set('Authorization', `Bearer ${token}`)
    .expect(404);
  expect(processes.delete).not.toHaveBeenCalled();
});

it('recusa a exclusão sem autenticação', async () => {
  await request(app.getHttpServer())
    .delete('/api/v1/feedback-processes/7')
    .expect(401);
  expect(processes.findById).not.toHaveBeenCalled();
  expect(processes.delete).not.toHaveBeenCalled();
});

it('recusa a exclusão por membro da equipe', async () => {
  const token = tokenFor(40, 'TEAM_MEMBER');

  await request(app.getHttpServer())
    .delete('/api/v1/feedback-processes/7')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
  expect(processes.findById).not.toHaveBeenCalled();
  expect(processes.delete).not.toHaveBeenCalled();
});
