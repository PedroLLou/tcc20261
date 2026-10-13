import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AuditLogQueryDto } from './audit-log.dto';

// Mesma configuração do ValidationPipe global em main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const validateQuery = (query: Record<string, string>) =>
  pipe.transform(query, { type: 'query', metatype: AuditLogQueryDto });

describe('AuditLogQueryDto', () => {
  it('deve aceitar todos os filtros da consulta de auditoria', async () => {
    const query = {
      tableName: 'User',
      recordId: '2',
      actorId: '1',
      operation: 'DELETE',
      source: 'APPLICATION',
      page: '2',
      pageSize: '50',
    };

    await expect(validateQuery(query)).resolves.toMatchObject(query);
  });

  it('deve aceitar a consulta sem filtros', async () => {
    await expect(validateQuery({})).resolves.toBeInstanceOf(AuditLogQueryDto);
  });

  it('deve rejeitar parâmetros que não são filtros conhecidos', async () => {
    await expect(validateQuery({ senha: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
