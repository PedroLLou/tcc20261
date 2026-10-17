// Configura o usuário de banco da API com privilégios mínimos (issue #106).
//
// Executar com a conexão do DONO do banco em DIRECT_URL, depois das migrações:
//
//   APP_DB_PASSWORD=<senha forte> npm run db:app-role
//
// Variáveis:
//   DIRECT_URL       conexão do dono do banco (obrigatória)
//   APP_DB_USER      nome do usuário da API (padrão: tcc_app)
//   APP_DB_PASSWORD  senha do usuário da API, com 16 caracteres ou mais
//
// O script é idempotente: pode ser executado de novo para trocar a senha ou
// reaplicar as permissões depois de novas migrações. Ver docs/banco-de-dados.md.
import 'dotenv/config';
import pg from 'pg';

const directUrl = process.env.DIRECT_URL;
const appUser = process.env.APP_DB_USER || 'tcc_app';
const appPassword = process.env.APP_DB_PASSWORD;

function fail(message) {
  console.error(`Erro: ${message}`);
  process.exit(1);
}

if (!directUrl) fail('defina DIRECT_URL com a conexão do dono do banco.');
if (!/^[a-z_][a-z0-9_]{2,62}$/.test(appUser)) {
  fail('APP_DB_USER deve ter só letras minúsculas, números e _.');
}
if (!appPassword || appPassword.length < 16) {
  fail('defina APP_DB_PASSWORD com 16 caracteres ou mais.');
}

const client = new pg.Client({ connectionString: directUrl });

function steps(database) {
  const role = client.escapeIdentifier(appUser);
  const roleName = client.escapeLiteral(appUser);
  return [
    // 1. Usuário de login, sem nenhum poder administrativo.
    [
      'usuário',
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleName}) THEN
           CREATE ROLE ${role} LOGIN;
         END IF;
       END $$`,
    ],
    // SUPERUSER e REPLICATION não são informados: um papel criado por um
    // usuário comum (como o dono do banco no Neon) já nasce sem eles, e só um
    // superusuário pode alterá-los. A verificação final confirma.
    [
      'senha e atributos',
      `ALTER ROLE ${role} WITH LOGIN NOCREATEDB NOCREATEROLE
         PASSWORD ${client.escapeLiteral(appPassword)}`,
    ],
    // 2. Acesso ao banco e ao schema, sem permissão de criar objetos.
    ['conexão', `GRANT CONNECT ON DATABASE ${client.escapeIdentifier(database)} TO ${role}`],
    ['schema', `GRANT USAGE ON SCHEMA public TO ${role}`],
    ['sem CREATE no schema', `REVOKE CREATE ON SCHEMA public FROM ${role}`],
    // 3. Leitura e escrita nas tabelas do sistema.
    [
      'tabelas',
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    ],
    ['sequências', `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`],
    // 4. Exceções: migrações fora de alcance; auditoria só para leitura.
    ['sem acesso às migrações', `REVOKE ALL ON "_prisma_migrations" FROM ${role}`],
    [
      'AuditLog somente leitura',
      `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON "AuditLog" FROM ${role}`,
    ],
    // 5. Tabelas criadas por migrações futuras (pelo dono) já nascem
    //    acessíveis à API.
    [
      'privilégios padrão (tabelas)',
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public
         GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
    ],
    [
      'privilégios padrão (sequências)',
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public
         GRANT USAGE, SELECT ON SEQUENCES TO ${role}`,
    ],
    // 6. A auditoria só aceita o contexto da aplicação vindo deste usuário.
    [
      'papel confiável da auditoria',
      `CREATE OR REPLACE FUNCTION audit_trusted_role()
         RETURNS text LANGUAGE sql STABLE
         AS $fn$ SELECT ${roleName}::text $fn$`,
    ],
  ];
}

try {
  await client.connect();
  const { rows } = await client.query(
    'SELECT current_user AS owner, current_database() AS database',
  );
  const { owner, database } = rows[0];
  if (owner === appUser) {
    throw new Error('DIRECT_URL deve usar o dono do banco, não o usuário da API.');
  }

  await client.query('BEGIN');
  for (const [label, sql] of steps(database)) {
    await client.query(sql);
    console.log(`  ok  ${label}`);
  }

  // 7. O usuário da API não pode ser membro de outro papel: com SET ROLE para
  //    o dono das tabelas, ele conseguiria desligar a auditoria.
  const { rows: memberships } = await client.query(
    `SELECT roleid::regrole::text AS papel FROM pg_auth_members
      WHERE member = (SELECT oid FROM pg_roles WHERE rolname = $1)`,
    [appUser],
  );
  for (const { papel } of memberships) {
    await client.query(`REVOKE ${papel} FROM ${client.escapeIdentifier(appUser)}`);
  }
  console.log(
    `  ok  associações a outros papéis: ${memberships.length ? `${memberships.length} revogada(s), conferido abaixo` : 'nenhuma'}`,
  );

  // Verificação final: nenhum poder administrativo e nenhum papel que possa
  // ser assumido, direta ou indiretamente. Um REVOKE sem efeito (associação
  // concedida por outro usuário) também é barrado aqui.
  const check = await client.query(
    `SELECT r.rolsuper OR r.rolreplication OR r.rolbypassrls
              OR r.rolcreaterole OR r.rolcreatedb AS poderoso,
            (SELECT string_agg(o.rolname, ', ' ORDER BY o.rolname) FROM pg_roles o
              WHERE o.oid <> r.oid AND pg_has_role(r.oid, o.oid, 'MEMBER')) AS herda
       FROM pg_roles r WHERE r.rolname = $1`,
    [appUser],
  );
  if (check.rows[0]?.poderoso !== false) {
    throw new Error(`o usuário "${appUser}" tem algum poder administrativo.`);
  }
  if (check.rows[0].herda) {
    throw new Error(
      `o usuário "${appUser}" ainda pode assumir os papéis: ${check.rows[0].herda}. ` +
        'Remova essas associações com quem as concedeu e rode o script de novo.',
    );
  }
  console.log('  ok  sem poderes administrativos nem papéis de outros usuários');
  await client.query('COMMIT');
  console.log(`\nUsuário "${appUser}" configurado no banco "${database}" (dono: ${owner}).`);
  console.log('Use-o na DATABASE_URL da API. A DIRECT_URL continua com o dono, só para migrações.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
