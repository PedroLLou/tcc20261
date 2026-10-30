import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma.service';
import { createTestApp, resetDatabase, TEST_PASSWORD } from './setup-app';

interface LoginBody {
  email: string;
  name: string;
  role: string;
  access_token: string;
  message?: string;
}

const RH_ONLY_ROUTE = '/api/v1/auth/users';
let app: INestApplication<App>;

async function login(email: string, password = TEST_PASSWORD) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  return { status: response.status, body: response.body as LoginBody };
}

function getRhOnlyRoute(token?: string) {
  const call = request(app.getHttpServer()).get(RH_ONLY_ROUTE);
  return token ? call.set('Authorization', `Bearer ${token}`) : call;
}

beforeAll(async () => {
  app = await createTestApp();
  await resetDatabase(app.get(PrismaService));
});

afterAll(async () => {
  await app.close();
});

describe('POST /api/v1/auth/login', () => {
  it('autentica um usuário existente e devolve um token sem a senha', async () => {
    const { status, body } = await login('membro@teste.com');

    expect(status).toBe(201);
    expect(body).toMatchObject({
      email: 'membro@teste.com',
      name: 'Membro Teste',
      role: 'TEAM_MEMBER',
    });
    expect(typeof body.access_token).toBe('string');
    expect(body).not.toHaveProperty('password');
  });

  it('recusa senha incorreta e e-mail inexistente com a mesma mensagem', async () => {
    const wrongPassword = await login('membro@teste.com', 'senha-errada');
    const unknownEmail = await login('naoexiste@teste.com');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Credenciais inválidas');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });
});

describe('Rota exclusiva do RH, com o token do login', () => {
  it('bloqueia a requisição sem token', async () => {
    await getRhOnlyRoute().expect(401);
  });

  it('bloqueia um token inválido', async () => {
    await getRhOnlyRoute('token-invalido').expect(401);
  });

  it.each([
    ['membro', 'membro@teste.com'],
    ['líder', 'lider@teste.com'],
  ])('bloqueia o perfil %s com 403', async (_perfil, email) => {
    const { body } = await login(email);

    await getRhOnlyRoute(body.access_token).expect(403);
  });

  it('permite o RH e devolve os usuários do banco', async () => {
    const { body } = await login('rh@teste.com');

    const response = await getRhOnlyRoute(body.access_token).expect(200);

    const emails = (response.body as { email: string }[]).map((u) => u.email);
    expect(emails).toEqual(
      expect.arrayContaining([
        'rh@teste.com',
        'lider@teste.com',
        'membro@teste.com',
      ]),
    );
  });
});
