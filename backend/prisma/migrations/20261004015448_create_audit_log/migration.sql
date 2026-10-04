-- CreateEnum
CREATE TYPE "AuditOperation" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('APPLICATION', 'DATABASE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "operation" "AuditOperation" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "actorId" INTEGER,
    "actorEmail" TEXT,
    "source" "AuditSource" NOT NULL,
    "dbUser" TEXT NOT NULL,
    "clientIp" TEXT,
    "request" TEXT,
    "transactionId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tableName_recordId_idx" ON "AuditLog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- ---------------------------------------------------------------------------
-- Auditoria no nível do banco de dados (não-repúdio)
--
-- Os registros de "AuditLog" são gravados por trigger, na mesma transação da
-- operação auditada: se a operação sofrer rollback, o registro também sofre.
-- Operações feitas fora da API (pgAdmin, psql) também são capturadas.
--
-- A aplicação informa quem está operando por meio de configurações locais da
-- transação (app.source, app.actor_id, app.actor_email, app.client_ip,
-- app.request), definidas em src/prisma-audit.extension.ts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Colunas que nunca são copiadas para a auditoria (nem o hash da senha).
  sensitive_keys CONSTANT text[] := ARRAY['password'];
  sensitive_key  text;
  old_row        jsonb;
  new_row        jsonb;
  -- Papel de banco usado pela API. Quando configurado (ALTER DATABASE ... SET
  -- audit.application_role = '...'), o contexto app.* só é aceito se a conexão
  -- usar esse papel, impedindo que uma sessão manual se passe pela aplicação.
  app_role       text := NULLIF(current_setting('audit.application_role', true), '');
  from_app       boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' AND old_row = new_row THEN
    RETURN NULL;
  END IF;

  FOREACH sensitive_key IN ARRAY sensitive_keys LOOP
    IF old_row ? sensitive_key THEN
      old_row := jsonb_set(old_row, ARRAY[sensitive_key], '"[PROTEGIDO]"');
    END IF;
    IF new_row ? sensitive_key THEN
      new_row := jsonb_set(
        new_row,
        ARRAY[sensitive_key],
        CASE
          WHEN TG_OP = 'UPDATE'
            AND (to_jsonb(OLD) -> sensitive_key) IS DISTINCT FROM (to_jsonb(NEW) -> sensitive_key)
          THEN '"[ALTERADO]"'::jsonb
          ELSE '"[PROTEGIDO]"'::jsonb
        END
      );
    END IF;
  END LOOP;

  from_app := COALESCE(current_setting('app.source', true) = 'APPLICATION', false)
              AND (app_role IS NULL OR session_user = app_role);

  INSERT INTO "AuditLog" (
    "operation", "tableName", "recordId", "oldData", "newData",
    "actorId", "actorEmail", "source", "dbUser", "clientIp", "request",
    "transactionId", "createdAt"
  ) VALUES (
    TG_OP::"AuditOperation",
    TG_TABLE_NAME,
    COALESCE(new_row ->> 'id', old_row ->> 'id', ''),
    old_row,
    new_row,
    CASE WHEN from_app THEN NULLIF(current_setting('app.actor_id', true), '')::integer END,
    CASE WHEN from_app THEN NULLIF(current_setting('app.actor_email', true), '') END,
    (CASE WHEN from_app THEN 'APPLICATION' ELSE 'DATABASE' END)::"AuditSource",
    session_user,
    CASE
      WHEN from_app THEN NULLIF(current_setting('app.client_ip', true), '')
      ELSE host(inet_client_addr())
    END,
    CASE WHEN from_app THEN NULLIF(current_setting('app.request', true), '') END,
    txid_current(),
    -- O Prisma lê colunas "timestamp" como UTC; o fuso da sessão não interfere.
    now() AT TIME ZONE 'UTC'
  );

  RETURN NULL;
END;
$$;

-- Registros de auditoria são imutáveis: UPDATE, DELETE e TRUNCATE são bloqueados.
CREATE OR REPLACE FUNCTION audit_log_block_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'A tabela "AuditLog" aceita apenas inserções: registros de auditoria são imutáveis.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "AuditLog_block_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block_changes();

CREATE TRIGGER "AuditLog_block_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block_changes();

-- Ativa a auditoria em uma tabela. Para auditar uma tabela nova, basta incluir
-- em uma migração: SELECT audit_enable('"NomeDaTabela"');
CREATE OR REPLACE FUNCTION audit_enable(target regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %s', target);
  EXECUTE format(
    'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %s '
    'FOR EACH ROW EXECUTE FUNCTION audit_record_change()',
    target
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION audit_enable(regclass) FROM PUBLIC;

SELECT audit_enable('"User"');
SELECT audit_enable('"Team"');
SELECT audit_enable('"FeedbackProcess"');

COMMENT ON TABLE "AuditLog" IS
  'Registro imutável de INSERT/UPDATE/DELETE nas tabelas auditadas, gravado por trigger (não-repúdio).';
