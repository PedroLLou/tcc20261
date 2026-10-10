import { Prisma } from '@prisma/client';
import {
  AuditContext,
  AuditContextService,
} from './services/audit-context.service';

/**
 * Extensão do Prisma Client que informa ao PostgreSQL quem está operando.
 *
 * Os registros de auditoria são gravados pelos triggers do banco (migração
 * create_audit_log). Antes de cada escrita, esta extensão define, na mesma
 * transação, as configurações locais app.* lidas pelo trigger. Assim:
 * - a auditoria é atômica com a operação (rollback desfaz os dois);
 * - os services não precisam de nenhum código de auditoria;
 * - escritas feitas fora da API são registradas com origem DATABASE.
 *
 * Observação: as consultas do Prisma são preguiçosas (executam no await), e o
 * contexto é lido nesse momento. Por isso, a escrita precisa ser aguardada
 * dentro da requisição, como já acontece nos services async.
 */

const WRITE_OPERATIONS = new Set<string>([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
  '$executeRaw',
  '$executeRawUnsafe',
]);

const MAX_REQUEST_LENGTH = 255;

type RawExecutor = Pick<Prisma.TransactionClient, '$executeRaw'>;
type TransactionCallback = (tx: unknown) => Promise<unknown>;
type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

function setTransactionContext(
  executor: RawExecutor,
  context: AuditContext,
): Prisma.PrismaPromise<number> {
  const request = (context.request ?? '').slice(0, MAX_REQUEST_LENGTH);
  return executor.$executeRaw`
    SELECT set_config('app.source', 'APPLICATION', true),
           set_config('app.actor_id', ${String(context.actorId ?? '')}, true),
           set_config('app.actor_email', ${context.actorEmail ?? ''}, true),
           set_config('app.client_ip', ${context.clientIp ?? ''}, true),
           set_config('app.request', ${request}, true)`;
}

export function auditExtension(auditContext: AuditContextService) {
  return Prisma.defineExtension((client) => {
    const withContext = () =>
      setTransactionContext(client, auditContext.current());

    return client.$extends({
      name: 'audit-context',
      client: {
        $transaction(arg: unknown, options?: TransactionOptions) {
          if (typeof arg === 'function') {
            // Transação interativa: o contexto é definido no início e vale até
            // o commit. O "tx" vem do client base, sem esta extensão, para que
            // as escritas não sejam reembrulhadas fora da transação.
            return client.$transaction(async (tx) => {
              await setTransactionContext(tx, auditContext.current());
              return (arg as TransactionCallback)(tx);
            }, options);
          }
          // Transação em lote: o contexto entra como primeira instrução.
          const operations = arg as Prisma.PrismaPromise<unknown>[];
          return auditContext
            .runInBatchTransaction(() =>
              client.$transaction([withContext(), ...operations], options),
            )
            .then((results) => results.slice(1));
        },
      },
      query: {
        // Escrita avulsa: vira um lote [contexto, escrita] na mesma transação.
        async $allOperations({ operation, args, query }) {
          if (
            !WRITE_OPERATIONS.has(operation) ||
            auditContext.isInBatchTransaction()
          ) {
            return query(args) as Promise<unknown>;
          }
          const [, result] = await client.$transaction([
            withContext(),
            query(args) as Prisma.PrismaPromise<unknown>,
          ]);
          return result;
        },
      },
    });
  });
}
