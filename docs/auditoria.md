# Auditoria do banco de dados

Registro de todas as alterações feitas nos dados do sistema, para garantir o
**não-repúdio**: saber quem alterou o quê, quando e qual era o valor antes e
depois. Responsável: camada de banco de dados (Fillipe).

---

## 1. Como funciona

```
Requisição HTTP ─► JwtAuthGuard ─► AuditContextInterceptor ─► controller ─► service
                                   (guarda quem é o usuário)                  │
                                                                              ▼
                                   prisma-audit.extension.ts ◄──── this.prisma.user.create(...)
                                   (informa o usuário ao banco)
                                                                              │
PostgreSQL:  INSERT/UPDATE/DELETE em "User", "Team", "FeedbackProcess"        ▼
             └─► trigger audit_record_change() ─► INSERT em "AuditLog" (mesma transação)
```

1. O `AuditContextInterceptor` (global) guarda o usuário autenticado, o IP e a
   rota da requisição em um `AsyncLocalStorage`.
2. A extensão do Prisma, antes de cada escrita, executa `set_config('app.*')`
   **na mesma transação** da escrita.
3. O trigger `audit_record_change()` grava o registro em `"AuditLog"`.

Consequências:

- **Nenhum código de auditoria nos services.** Basta usar `this.prisma`
  normalmente, inclusive dentro de `$transaction`.
- **Atomicidade.** Se a operação sofrer rollback, o registro de auditoria
  também sofre.
- **Operações fora da API também são registradas** (pgAdmin, psql), com
  `source = DATABASE`, o usuário do banco (`dbUser`) e o IP da conexão.
- **Senhas nunca vão para a auditoria.** A coluna `password` aparece como
  `[PROTEGIDO]`, ou `[ALTERADO]` quando a senha muda.
- **Conteúdo binário não é copiado.** Toda coluna `BYTEA`, como o conteúdo de
  um anexo, aparece como `{"sha256": "...", "bytes": N}`. O *hash* identifica
  exatamente o arquivo gravado, sem guardar uma cópia dele numa tabela que não
  pode ser limpa.
- **Registros imutáveis.** `UPDATE`, `DELETE` e `TRUNCATE` em `"AuditLog"`
  são bloqueados por trigger.
- **Sem chave estrangeira para `User`.** O histórico sobrevive à exclusão do
  usuário; o e-mail do autor fica gravado no próprio registro.

---

## 2. Consultar a auditoria

`GET /api/v1/audit-logs` — somente `ADMIN_RH`.

| Parâmetro | Exemplo | Descrição |
|---|---|---|
| `tableName` | `User` | Tabela afetada |
| `recordId` | `12` | Id do registro afetado |
| `actorId` | `1` | Id do usuário que fez a operação |
| `operation` | `DELETE` | `INSERT`, `UPDATE` ou `DELETE` |
| `source` | `DATABASE` | `APPLICATION` ou `DATABASE` |
| `page`, `pageSize` | `1`, `20` | Paginação (máximo de 100 por página) |

Registros com o mesmo `transactionId` foram feitos na mesma transação (por
exemplo, a exclusão de um usuário e dos processos apagados em cascata).

---

## 3. Auditar uma tabela nova

Ao criar uma tabela, inclua na mesma migração (crie com
`npx prisma migrate dev --create-only` e edite o SQL):

```sql
SELECT audit_enable('"NomeDaTabela"');
```

Se a tabela tiver colunas sensíveis além de `password`, avise o responsável
pela camada de banco para incluí-las na lista `sensitive_keys` do trigger.
Colunas `BYTEA` não precisam de aviso: são detectadas pelo tipo e registradas
como *hash* e tamanho.

---

## 4. Testes

- Unitários (rodam no CI): `npm test`.
- Integração com PostgreSQL real (atomicidade, rollback, origem DATABASE,
  senha protegida, imutabilidade). Precisa de um banco com as migrações
  aplicadas; sem a variável, os testes são ignorados:

```bash
DATABASE_URL="postgresql://.../tcc_test" npx prisma migrate deploy
AUDIT_TEST_DATABASE_URL="postgresql://.../tcc_test" npm test -- prisma-audit
```

---

## 5. Papel confiável e falsificação do autor

O *trigger* só aceita o autor informado pela aplicação (`app.source`,
`app.actor_id`...) quando a conexão usa o **usuário de banco da API**. Esse
usuário é definido pela função `audit_trusted_role()`, que só o dono do banco
consegue redefinir.

- **Ambiente local e Compose** (um único usuário de banco): a função retorna
  `NULL` e o contexto de qualquer sessão é aceito.
- **Neon** (usuário `tcc_app` para a API): o script `npm run db:app-role`
  redefine a função com `tcc_app`. Uma sessão de outro usuário, como o pgAdmin
  conectado com o dono, que tente se passar pela aplicação é registrada com
  origem `DATABASE` e **sem autor**. Ver
  [`docs/banco-de-dados.md`](banco-de-dados.md).

Não redefina `audit_trusted_role()` em migrações: isso apagaria a configuração
feita pelo script nos ambientes compartilhados.

---

## 6. Limitações conhecidas

- O **dono das tabelas** (`tcc_owner` no Neon) pode desativar *triggers*. A
  API não usa esse usuário: ele fica restrito às migrações, e a senha não deve
  ser compartilhada além de quem as executa.
- O próprio usuário da API (`tcc_app`) é confiável por definição. Quem obtiver
  a senha dele consegue informar qualquer autor. Por isso ela fica só nas
  variáveis de ambiente da API.
- A auditoria cobre **alterações** (integridade). O registro de **leituras**
  (confidencialidade) não faz parte desta etapa.
