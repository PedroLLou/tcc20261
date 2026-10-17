import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditOperation, AuditSource, Prisma } from '@prisma/client';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import {
  AuditLogPageDto,
  AuditLogQueryDto,
  AuditLogResponseDto,
} from '../dto/audit-log.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Consulta dos registros de auditoria. Apenas leitura: os registros são
 * gravados pelos triggers do PostgreSQL e não podem ser alterados.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogs: AuditLogRepository) {}

  async list(query: AuditLogQueryDto): Promise<AuditLogPageDto> {
    const where = this.buildFilter(query);
    const page = this.parsePositiveInt(query.page, 'page') ?? 1;
    const pageSize = Math.min(
      this.parsePositiveInt(query.pageSize, 'pageSize') ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const [total, logs] = await this.auditLogs.list(
      where,
      (page - 1) * pageSize,
      pageSize,
    );

    return {
      page,
      pageSize,
      total,
      items: logs.map((log): AuditLogResponseDto => ({
        ...log,
        transactionId: log.transactionId.toString(),
      })),
    };
  }

  private buildFilter(query: AuditLogQueryDto): Prisma.AuditLogWhereInput {
    return {
      tableName: this.normalizeText(query.tableName),
      recordId: this.normalizeText(query.recordId),
      actorId: this.parsePositiveInt(query.actorId, 'actorId'),
      operation: this.parseEnum(query.operation, AuditOperation, 'operation'),
      source: this.parseEnum(query.source, AuditSource, 'source'),
    };
  }

  private normalizeText(value?: string): string | undefined {
    const text = value?.trim();
    return text ? text : undefined;
  }

  private parsePositiveInt(value: string | undefined, field: string) {
    if (value === undefined || value.trim() === '') return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(
        `O filtro ${field} deve ser um número inteiro positivo.`,
      );
    }
    return parsed;
  }

  private parseEnum<T extends string>(
    value: string | undefined,
    allowed: Record<string, T>,
    field: string,
  ): T | undefined {
    const text = this.normalizeText(value)?.toUpperCase();
    if (text === undefined) return undefined;
    const options = Object.values(allowed);
    if (!options.includes(text as T)) {
      throw new BadRequestException(
        `O filtro ${field} deve ser um destes valores: ${options.join(', ')}.`,
      );
    }
    return text as T;
  }
}
