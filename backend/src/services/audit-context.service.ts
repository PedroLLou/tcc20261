import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  actorId: number | null;
  actorEmail: string | null;
  clientIp: string | null;
  request: string | null;
}

interface AuditContextStore extends AuditContext {
  inBatchTransaction: boolean;
}

/**
 * Guarda, durante cada requisição, quem está operando o sistema.
 *
 * O contexto é preenchido pelo AuditContextInterceptor e lido pela extensão
 * de auditoria do Prisma (src/prisma-audit.extension.ts), que o repassa ao
 * PostgreSQL. O AsyncLocalStorage mantém o valor isolado por requisição, sem
 * precisar passá-lo como parâmetro entre controllers, services e Prisma.
 */
@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditContextStore>();

  run<T>(context: AuditContext, callback: () => T): T {
    return this.storage.run(
      { ...context, inBatchTransaction: false },
      callback,
    );
  }

  current(): AuditContext {
    const store = this.storage.getStore();
    return {
      actorId: store?.actorId ?? null,
      actorEmail: store?.actorEmail ?? null,
      clientIp: store?.clientIp ?? null,
      request: store?.request ?? null,
    };
  }

  runInBatchTransaction<T>(callback: () => T): T {
    return this.storage.run(
      { ...this.current(), inBatchTransaction: true },
      callback,
    );
  }

  isInBatchTransaction(): boolean {
    return this.storage.getStore()?.inBatchTransaction ?? false;
  }
}
