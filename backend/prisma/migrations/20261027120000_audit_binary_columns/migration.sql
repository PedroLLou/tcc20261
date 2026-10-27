-- ---------------------------------------------------------------------------
-- Colunas binárias na auditoria
--
-- O trigger copiava a linha inteira para "AuditLog". Em colunas binárias
-- (BYTEA), como o conteúdo de um anexo, isso gravava o arquivo inteiro, em
-- texto hexadecimal (o dobro do tamanho), na inserção e de novo na exclusão.
-- Como a auditoria é imutável, esse espaço nunca poderia ser liberado, e o
-- conteúdo de arquivos excluídos ficaria guardado para sempre.
--
-- Agora, toda coluna BYTEA da tabela auditada é registrada como
-- {"sha256": "...", "bytes": N}: o hash identifica exatamente o conteúdo
-- gravado (não-repúdio) sem copiá-lo. As colunas são detectadas pelo tipo,
-- então tabelas futuras com conteúdo binário já ficam cobertas.
--
-- O restante da função é igual ao da migração audit_trusted_role.
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
  binary_key     text;
  binary_digest  text;
  binary_size    integer;
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

  -- Colunas binárias: hash SHA-256 e tamanho no lugar do conteúdo. O hash é
  -- calculado sobre o valor original da linha (OLD/NEW), não sobre o texto.
  FOR binary_key IN
    SELECT attname::text
      FROM pg_attribute
     WHERE attrelid = TG_RELID
       AND attnum > 0
       AND NOT attisdropped
       AND atttypid = 'bytea'::regtype
  LOOP
    IF old_row ? binary_key AND old_row -> binary_key <> 'null'::jsonb THEN
      EXECUTE format('SELECT encode(sha256(($1).%I), ''hex''), octet_length(($1).%I)',
                     binary_key, binary_key)
        INTO binary_digest, binary_size
        USING OLD;
      old_row := jsonb_set(old_row, ARRAY[binary_key],
                           jsonb_build_object('sha256', binary_digest, 'bytes', binary_size));
    END IF;
    IF new_row ? binary_key AND new_row -> binary_key <> 'null'::jsonb THEN
      EXECUTE format('SELECT encode(sha256(($1).%I), ''hex''), octet_length(($1).%I)',
                     binary_key, binary_key)
        INTO binary_digest, binary_size
        USING NEW;
      new_row := jsonb_set(new_row, ARRAY[binary_key],
                           jsonb_build_object('sha256', binary_digest, 'bytes', binary_size));
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
