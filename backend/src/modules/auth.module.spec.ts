import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../services/auth.service';
import { AuthModule } from './auth.module';

const originalSecret = process.env.JWT_SECRET;
const configuredSecret = '  chave-ficticia-exclusiva-deste-teste  ';
const payload = { sub: 1, email: 'rh@example.invalid', role: 'ADMIN_RH' };
const authService = {
  validateToken: jest.fn().mockResolvedValue({ id: 1, role: 'ADMIN_RH' }),
  listManagedUsers: jest.fn().mockResolvedValue([]),
};
let moduleRef: TestingModule | undefined;
let app: INestApplication<Server> | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = configuredSecret;
});

afterEach(async () => {
  if (app) await app.close();
  else if (moduleRef) await moduleRef.close();
  app = undefined;
  moduleRef = undefined;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

async function createAuthModule() {
  moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(AuthService)
    .useValue(authService)
    .compile();
  return moduleRef;
}

async function startAuthApp() {
  const authModule = await createAuthModule();
  app = authModule.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
  return app.getHttpServer();
}

it.each([undefined, '', '   ', '\t\n'])(
  'recusa a inicialização com JWT_SECRET ausente ou vazio (%p)',
  async (secret) => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;

    await expect(createAuthModule()).rejects.toThrow(
      'JWT_SECRET deve ser definido e não pode estar vazio.',
    );
  },
);

it('assina e aceita tokens com a chave configurada, preservando seus bytes e a validade', async () => {
  const server = await startAuthApp();
  const token = moduleRef!.get(JwtService).sign(payload);
  const verifier = new JwtService({ secret: configuredSecret });
  const claims = verifier.verify<{ sub: number; iat: number; exp: number }>(
    token,
  );

  expect(claims.sub).toBe(payload.sub);
  expect(claims.exp - claims.iat).toBe(24 * 60 * 60);
  await request(server)
    .get('/api/v1/auth/users')
    .set('Authorization', `Bearer ${token}`)
    .expect(200, []);
  expect(authService.validateToken).toHaveBeenCalledWith(
    expect.objectContaining(payload),
  );
});

it.each(['your-secret-key', 'outra-chave-ficticia'])(
  'rejeita tokens assinados com outra chave (%s)',
  async (secret) => {
    const server = await startAuthApp();
    const token = new JwtService({ secret }).sign(payload);

    await request(server)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(authService.validateToken).not.toHaveBeenCalled();
    expect(authService.listManagedUsers).not.toHaveBeenCalled();
  },
);
