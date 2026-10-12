-- ---------------------------------------------------------------------------
-- Papel de banco confiável para a auditoria
--
-- O trigger só aceita o contexto informado pela aplicação (app.source,
-- app.actor_id...) quando a conexão usa o papel de banco da API. Antes, esse
-- papel vinha da configuração audit.application_role, que qualquer sessão
-- pode alterar com SET. Agora ele vem desta função, que só o dono do banco
-- consegue redefinir.
--
-- Valor padrão NULL: aceita o contexto de qualquer sessão (ambiente local e
-- Compose, com um único usuário de banco). Em ambientes com usuário restrito
-- para a API (Neon), o script prisma/configure-app-role.mjs redefine a função
-- com o nome desse papel. Não redefina esta função em migrações futuras.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_trusted_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT NULL::text $$;

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
  -- Papel de banco da API (ver audit_trusted_role). Quando definido, o
  -- contexto app.* só é aceito se a conexão usar esse papel, impedindo que
  -- uma sessão manual se passe pela aplicação.
  app_role       text := audit_trusted_role();
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
