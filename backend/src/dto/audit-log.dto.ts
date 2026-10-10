/** Filtros aceitos em GET /audit-logs (todos opcionais, vindos da query string). */
export class AuditLogQueryDto {
  tableName?: string;
  recordId?: string;
  actorId?: string;
  operation?: string;
  source?: string;
  page?: string;
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
