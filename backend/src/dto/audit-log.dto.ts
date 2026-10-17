import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Filtros aceitos em GET /audit-logs (todos opcionais, vindos da query string).
 *
 * Os decorators permitem que o ValidationPipe global (whitelist +
 * forbidNonWhitelisted) aceite os filtros. A conversão para número e a
 * checagem dos valores permitidos ficam no AuditLogService, que devolve
 * mensagens específicas em português.
 */
export class AuditLogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tableName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recordId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  operation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  page?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pageSize?: string;
}

export class AuditLogResponseDto {
  id: number;
  operation: string;
  tableName: string;
  recordId: string;
  oldData: unknown;
  newData: unknown;
  actorId: number | null;
  actorEmail: string | null;
  source: string;
  dbUser: string;
  clientIp: string | null;
  request: string | null;
  transactionId: string;
  createdAt: Date;
}

export class AuditLogPageDto {
  page: number;
  pageSize: number;
  total: number;
  items: AuditLogResponseDto[];
}
