/* eslint-disable max-lines-per-function */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('deve cadastrar um usuário válido', async () => {
      const registerDto = {
        name: 'Leonardo',
        age: 25,
        email: 'leo@email.com',
        password: '123456',
      };

      const createdUser = {
        id: 1,
        name: 'Leonardo',
        age: 25,
        email: 'leo@email.com',
        password: 'senha-hash',
        role: 'TEAM_MEMBER',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(createdUser);
      jwtServiceMock.sign.mockReturnValue('token-teste');

      (bcrypt.hash as jest.Mock).mockResolvedValue('senha-hash');

      const result = await authService.register(registerDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'leo@email.com' },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Leonardo',
          age: 25,
          email: 'leo@email.com',
          password: 'senha-hash',
          role: 'TEAM_MEMBER',
        },
      });

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'leo@email.com',
        role: 'TEAM_MEMBER',
      });

      expect(result).toEqual({
        id: 1,
        email: 'leo@email.com',
        name: 'Leonardo',
        role: 'TEAM_MEMBER',
        access_token: 'token-teste',
      });
    });

    it('deve rejeitar um e-mail já cadastrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'leo@email.com',
      });

      await expect(
        authService.register({
          name: 'Leonardo',
          age: 25,
          email: 'leo@email.com',
          password: '123456',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('deve realizar login com credenciais válidas', async () => {
      const user = {
        id: 1,
        name: 'Leonardo',
        age: 25,
        email: 'leo@email.com',
        password: 'senha-hash',
        role: 'TEAM_MEMBER',
      };

      prismaMock.user.findUnique.mockResolvedValue(user);
      jwtServiceMock.sign.mockReturnValue('token-teste');

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'leo@email.com',
        password: '123456',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'leo@email.com' },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'senha-hash');

      expect(result).toEqual({
        id: 1,
        email: 'leo@email.com',
        name: 'Leonardo',
        role: 'TEAM_MEMBER',
        access_token: 'token-teste',
      });
    });

    it('deve rejeitar login quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'naoexiste@email.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar login com senha inválida', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Leonardo',
        age: 25,
        email: 'leo@email.com',
        password: 'senha-hash',
        role: 'TEAM_MEMBER',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'leo@email.com',
          password: 'senha-errada',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('deve retornar o usuário quando o token for válido', async () => {
      const user = {
        id: 1,
        name: 'Leonardo',
        age: 25,
        email: 'leo@email.com',
        password: 'senha-hash',
        role: 'TEAM_MEMBER',
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await authService.validateToken({
        sub: 1,
        email: 'leo@email.com',
        role: 'TEAM_MEMBER',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(result).toEqual(user);
    });

    it('deve rejeitar token quando o usuário não existir', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.validateToken({
          sub: 999,
          email: 'naoexiste@email.com',
          role: 'TEAM_MEMBER',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
