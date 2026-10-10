/* eslint-disable max-lines-per-function */
import { BadRequestException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;

  const prismaMock = {
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const storedLog = {
    id: 10,
    operation: 'DELETE',
    tableName: 'User',
    recordId: '2',
    oldData: { id: 2, password: '[PROTEGIDO]' },
    newData: null,
    actorId: 1,
    actorEmail: 'rh@empresa.com',
    source: 'APPLICATION',
    dbUser: 'postgres',
    clientIp: '::1',
    request: 'DELETE /api/v1/auth/users/2',
    transactionId: BigInt(995),
    createdAt: new Date('2026-10-04T02:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogService(prismaMock as unknown as PrismaService);
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([storedLog]);
  });

  it('deve listar com paginação padrão e converter o id da transação para texto', async () => {
    const result = await service.list({});

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        tableName: undefined,
        recordId: undefined,
        actorId: undefined,
        operation: undefined,
        source: undefined,
      },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [{ ...storedLog, transactionId: '995' }],
    });
  });

  it('deve aplicar filtros normalizados e limitar o tamanho da página', async () => {
    await service.list({
      tableName: ' User ',
      recordId: '2',
      actorId: '1',
      operation: 'delete',
      source: 'application',
      page: '3',
      pageSize: '500',
    });

    const where = {
      tableName: 'User',
      recordId: '2',
      actorId: 1,
      operation: 'DELETE',
      source: 'APPLICATION',
    };
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith({ where });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where,
      orderBy: { id: 'desc' },
      skip: 200,
      take: 100,
    });
  });

  it.each([
    [{ actorId: 'abc' }, 'actorId'],
    [{ page: '0' }, 'page'],
    [{ pageSize: '-5' }, 'pageSize'],
    [{ operation: 'DROP' }, 'operation'],
    [{ source: 'pgadmin' }, 'source'],
  ])('deve rejeitar o filtro inválido %j', async (query, field) => {
    await expect(service.list(query)).rejects.toThrow(BadRequestException);
    await expect(service.list(query)).rejects.toThrow(field);
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
  });
});
