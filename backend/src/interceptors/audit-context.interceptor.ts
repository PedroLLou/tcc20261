import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import {
  AuditContext,
  AuditContextService,
} from '../services/audit-context.service';

type AuditedRequest = Request & {
  user?: { id?: number; email?: string };
};

/**
 * Abre o contexto de auditoria de cada requisição HTTP.
 *
 * Interceptors rodam depois dos guards, então request.user já foi preenchido
 * pelo JwtAuthGuard nas rotas autenticadas. Em rotas públicas (login,
 * cadastro), o autor fica nulo e a origem continua sendo a aplicação.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly auditContext: AuditContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const auditData = buildAuditContext(request);

    return new Observable((subscriber) =>
      this.auditContext.run(auditData, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}

export function buildAuditContext(request: AuditedRequest): AuditContext {
  // A query string fica de fora: pode conter dados pessoais (minimização).
  const path = (request.originalUrl ?? request.url ?? '').split('?')[0];
  return {
    actorId: request.user?.id ?? null,
    actorEmail: request.user?.email ?? null,
    clientIp: request.ip ?? null,
    request: `${request.method} ${path}`,
  };
}
