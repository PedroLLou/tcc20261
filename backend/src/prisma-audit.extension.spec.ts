/* eslint-disable max-lines-per-function */
import { createHash, randomBytes } from 'crypto';
import { Client } from 'pg';
import { PrismaService } from './prisma.service';
import { AuditContextService } from './services/audit-context.service';

/**
 * Teste de integração da auditoria: precisa de um PostgreSQL com as migrações
 * aplicadas. Sem a variável AUDIT_TEST_DATABASE_URL (como no CI), é ignorado.
 *
 *   AUDIT_TEST_DATABASE_URL="postgresql://..." npm test -- prisma-audit
 */
const databaseUrl = process.env.AUDIT_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('Auditoria no PostgreSQL (integração)', () => {
  const auditContext = new AuditContextService();
  const actor = {
    actorId: 42,
    actorEmail: 'rh@empresa.com',
    clientIp: '10.0.0.1',
    request: 'POST /api/v1/teste',
  };
  let prisma: PrismaService;

  const uniqueName = (prefix: string) =>
    `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;

  const auditOf = (tableName: string, recordId: number) =>
    prisma.auditLog.findMany({
      where: { tableName, recordId: String(recordId) },
      orderBy: { id: 'asc' },
    });

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaService(auditContext);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve registrar a escrita da aplicação com o autor da requisição', async () => {
    const team = await auditContext.run(actor, async () =>
      prisma.team.create({ data: { name: uniqueName('Equipe') } }),
    );

    const [log] = await auditOf('Team', team.id);
    expect(log).toMatchObject({
      operation: 'INSERT',
      source: 'APPLICATION',
      actorId: 42,
      actorEmail: 'rh@empresa.com',
      clientIp: '10.0.0.1',
      request: 'POST /api/v1/teste',
    });
    expect(log.newData).toMatchObject({ name: team.name });
  });

  it('deve manter a auditoria dentro da transação interativa do chamador', async () => {
    let transactionId = '';
    const team = await auditContext.run(actor, async () =>
      prisma.$transaction(
        async (tx) => {
          const [row] = await tx.$queryRaw<
            { id: string }[]
          >`SELECT txid_current()::text AS id`;
          transactionId = row.id;
          return tx.team.create({ data: { name: uniqueName('Equipe') } });
        },
        { isolationLevel: 'Serializable' },
      ),
    );

    const [log] = await auditOf('Team', team.id);
    expect(log.transactionId.toString()).toBe(transactionId);
    expect(log.actorId).toBe(42);
  });

  it('deve desfazer a auditoria quando a transação sofre rollback', async () => {
    const name = uniqueName('Equipe');
    await expect(
      auditContext.run(actor, () =>
        prisma.$transaction(async (tx) => {
          await tx.team.create({ data: { name } });
          throw new Error('falha proposital');
        }),
      ),
    ).rejects.toThrow('falha proposital');

    expect(await prisma.team.findUnique({ where: { name } })).toBeNull();
    const logs = await prisma.auditLog.findMany({
      where: { tableName: 'Team', newData: { path: ['name'], equals: name } },
    });
    expect(logs).toHaveLength(0);
  });

  it('deve manter atômica a transação em lote', async () => {
    const [first, second] = await auditContext.run(actor, async () =>
      prisma.$transaction([
        prisma.team.create({ data: { name: uniqueName('Lote A') } }),
        prisma.team.create({ data: { name: uniqueName('Lote B') } }),
      ]),
    );

    const [logA] = await auditOf('Team', first.id);
    const [logB] = await auditOf('Team', second.id);
    expect(logA.transactionId).toBe(logB.transactionId);
    expect(logB.actorId).toBe(42);
  });

  it('deve registrar com origem DATABASE a escrita feita direto no banco', async () => {
    const direct = new Client({ connectionString: databaseUrl });
    await direct.connect();
    const name = uniqueName('Via pgAdmin');
    const result = await direct.query<{ id: number }>(
      'INSERT INTO "Team" (name, "updatedAt") VALUES ($1, now()) RETURNING id',
      [name],
    );
    await direct.end();

    const [log] = await auditOf('Team', result.rows[0].id);
    expect(log).toMatchObject({
      operation: 'INSERT',
      source: 'DATABASE',
      actorId: null,
      request: null,
    });
  });

  it('deve ocultar a senha e indicar quando ela foi alterada', async () => {
    const user = await auditContext.run(actor, async () =>
      prisma.user.create({
        data: {
          name: 'Pessoa Teste',
          age: 30,
          email: `${uniqueName('pessoa').replace(/\s/g, '.')}@teste.com`,
          password: 'hash-secreto',
          role: 'ADMIN_RH',
        },
      }),
    );
    await auditContext.run(actor, async () =>
      prisma.user.update({
        where: { id: user.id },
        data: { password: 'outro-hash' },
      }),
    );

    const [created, updated] = await auditOf('User', user.id);
    expect(created.newData).toMatchObject({ password: '[PROTEGIDO]' });
    expect(updated.oldData).toMatchObject({ password: '[PROTEGIDO]' });
    expect(updated.newData).toMatchObject({ password: '[ALTERADO]' });
    expect(
      JSON.stringify([created.newData, updated.oldData, updated.newData]),
    ).not.toContain('hash');
  });

  it('deve registrar colunas binárias como hash e tamanho, sem o conteúdo', async () => {
    const direct = new Client({ connectionString: databaseUrl });
    await direct.connect();
    const sha256 = (data: Buffer) =>
      createHash('sha256').update(data).digest('hex');
    const original = randomBytes(4096);
    const replaced = randomBytes(1024);
    try {
      await direct.query('BEGIN');
      await direct.query(
        'CREATE TEMP TABLE "AnexoTeste" (id serial PRIMARY KEY, nome text, conteudo bytea)',
      );
      await direct.query(`SELECT audit_enable('"AnexoTeste"')`);
      const { rows: inserted } = await direct.query<{ id: number }>(
        'INSERT INTO "AnexoTeste" (nome, conteudo) VALUES ($1, $2), ($3, NULL) RETURNING id',
        ['a.pdf', original, 'vazio.pdf'],
      );
      const [id, emptyId] = inserted.map((row) => row.id);
      await direct.query(
        'UPDATE "AnexoTeste" SET conteudo = $1 WHERE id = $2',
        [replaced, id],
      );
      await direct.query('DELETE FROM "AnexoTeste" WHERE id = $1', [id]);

      const { rows } = await direct.query<{
        operation: string;
        recordId: string;
        oldData: Record<string, unknown> | null;
        newData: Record<string, unknown> | null;
      }>(
        `SELECT operation, "recordId", "oldData", "newData" FROM "AuditLog"
          WHERE "tableName" = 'AnexoTeste' ORDER BY id`,
      );
      const ofRecord = rows.filter((row) => row.recordId === String(id));
      const [created, updated, deleted] = ofRecord;

      expect(ofRecord.map((row) => row.operation)).toEqual([
        'INSERT',
        'UPDATE',
        'DELETE',
      ]);
      expect(created.newData?.conteudo).toEqual({
        sha256: sha256(original),
        bytes: 4096,
      });
      expect(updated.oldData?.conteudo).toEqual({
        sha256: sha256(original),
        bytes: 4096,
      });
      expect(updated.newData?.conteudo).toEqual({
        sha256: sha256(replaced),
        bytes: 1024,
      });
      expect(deleted.oldData?.conteudo).toEqual({
        sha256: sha256(replaced),
        bytes: 1024,
      });
      const empty = rows.find((row) => row.recordId === String(emptyId));
      expect(empty?.newData?.conteudo).toBeNull();
      // Nenhum conteúdo binário (texto hexadecimal "\x...") na auditoria.
      expect(JSON.stringify(rows)).not.toContain('\\\\x');
    } finally {
      await direct.query('ROLLBACK');
      await direct.end();
    }
  });

  it('deve impedir alteração e exclusão dos registros de auditoria', async () => {
    await expect(
      prisma.$executeRawUnsafe('UPDATE "AuditLog" SET "actorId" = 1'),
    ).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe('DELETE FROM "AuditLog"'),
    ).rejects.toThrow();
  });
});

/**
 * Proteção contra falsificação do autor: quando a função audit_trusted_role()
 * aponta o usuário de banco da API, uma sessão de outro usuário que informe
 * app.source = 'APPLICATION' é registrada como DATABASE, sem autor.
 *
 * Precisa da conexão do dono do banco, que pode redefinir a função. Tudo roda
 * numa transação desfeita no final, sem deixar alterações.
 *
 *   AUDIT_TEST_OWNER_URL="postgresql://..." npm test -- prisma-audit
 */
const ownerUrl = process.env.AUDIT_TEST_OWNER_URL;
const describeWithOwner = ownerUrl ? describe : describe.skip;

describeWithOwner('Auditoria: papel confiável (integração)', () => {
  it('deve ignorar o contexto da aplicação vindo de outro usuário do banco', async () => {
    const owner = new Client({ connectionString: ownerUrl });
    await owner.connect();
    try {
      await owner.query('BEGIN');
      await owner.query(`CREATE OR REPLACE FUNCTION audit_trusted_role()
        RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'papel_da_api'::text $$`);
      await owner.query(`SELECT set_config('app.source', 'APPLICATION', true),
                                set_config('app.actor_id', '999', true)`);
      const name = `Falsificada ${Date.now()}`;
      await owner.query(
        'INSERT INTO "Team" (name, "updatedAt") VALUES ($1, now())',
        [name],
      );
      const { rows } = await owner.query<{
        source: string;
        actorId: number | null;
      }>(
        `SELECT source, "actorId" FROM "AuditLog"
          WHERE "tableName" = 'Team' AND "newData"->>'name' = $1`,
        [name],
      );

      expect(rows).toEqual([{ source: 'DATABASE', actorId: null }]);
    } finally {
      await owner.query('ROLLBACK');
      await owner.end();
    }
  });
});
