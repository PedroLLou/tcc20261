# Banco de dados (PostgreSQL no Neon)

Como o banco do sistema está organizado, como conseguir acesso e como trabalhar
com migrações. Responsável: camada de banco de dados (Fillipe).

> Auditoria das alterações: [`docs/auditoria.md`](auditoria.md).
> Análise de segurança: [`docs/analise-seguranca.md`](analise-seguranca.md).

---

## 1. Visão geral

O banco compartilhado da equipe fica no [Neon](https://neon.tech), um
PostgreSQL gerenciado:

- **Projeto:** `tcc20261`.
- **Versão:** PostgreSQL 17, a mesma do Compose local.
- **Região:** `aws-us-east-1`. O Neon não tem região no Brasil, e esta é a
  mais próxima entre as disponíveis.

```
API NestJS ── DATABASE_URL (usuário tcc_app, pelo pooler) ──┐
                                                             ├──► Neon (PostgreSQL 17)
Prisma Migrate ── DIRECT_URL (usuário tcc_owner, direto) ───┘
```

O projeto tem duas *branches*, cada uma um banco independente, com endereço e
senhas próprios:

| *Branch* | Uso | Quem acessa |
|---|---|---|
| `main` | Ambiente oficial: apresentações, defesa e futura implantação | Responsável pelo banco |
| `dev` | Desenvolvimento e testes da equipe | Equipe |

As senhas da `dev` **não** funcionam na `main`. Isso foi verificado.

---

## 2. Usuários do banco

| Usuário | Para que serve | Onde é usado |
|---|---|---|
| `tcc_owner` | Dono das tabelas. Aplica migrações e roda os scripts de administração | `DIRECT_URL` |
| `tcc_app` | Usuário da API, com **privilégios mínimos** (issue #106) | `DATABASE_URL` |

O que o `tcc_app` pode e não pode fazer (verificado em 12/10/2026):

| Pode | Não pode |
|---|---|
| Ler e gravar nas tabelas do sistema (`User`, `Team`, `FeedbackProcess`...) | Alterar, apagar ou truncar a `AuditLog` (só lê) |
| Usar as sequências dos ids | Ler a tabela `_prisma_migrations` |
| | Criar, alterar ou apagar tabelas |
| | Desativar *triggers* ou redefinir funções |
| | Criar usuários ou bancos |

As tabelas criadas por migrações futuras já nascem com leitura e escrita para o
`tcc_app` (*default privileges*).

---

## 3. Variáveis de ambiente

| Variável | Conteúdo | Usada por |
|---|---|---|
| `DATABASE_URL` | Conexão do `tcc_app`, pelo endereço com `-pooler` | API (Prisma Client) |
| `DIRECT_URL` | Conexão do `tcc_owner`, pelo endereço direto (sem `-pooler`) | Prisma Migrate e `npm run db:app-role` |

As URLs do Neon terminam com `?sslmode=require&channel_binding=require`.
Mantenha esses parâmetros.

Ao iniciar, o driver `pg` mostra um aviso de segurança sobre `sslmode`. Ele
avisa que, hoje, `require` já é tratado de forma mais rígida (verificação
completa do certificado). Pode ser ignorado.

Em um PostgreSQL local com um único usuário, as duas variáveis podem ser
iguais. O Compose já gera assim.

O `.env` é carregado na primeira linha do `main.ts`, antes de qualquer módulo.
Não mude essa ordem: alguns módulos leem variáveis no momento em que são
importados.

---

## 4. Como conseguir acesso e rodar a API

1. Peça ao responsável pelo banco as URLs da *branch* `dev`. Elas são passadas
   **por canal privado**, nunca em *issue*, PR, *commit* ou arquivo do
   repositório.
2. Copie `backend/.env.example` para `backend/.env` e preencha `DATABASE_URL`,
   `DIRECT_URL`, `JWT_SECRET` e o administrador inicial.
3. Rode a API normalmente:

```bash
cd backend
npm ci
npx prisma generate
npm run start:dev
```

---

## 5. Migrações

**Criar** uma migração depois de alterar o `schema.prisma` (testado no Neon):

```bash
npx prisma migrate dev --name descricao-curta
```

**Aplicar** as migrações existentes em um ambiente, usando a `DIRECT_URL`
desse ambiente:

```bash
npx prisma migrate deploy
```

Cuidados:

- **Tabela nova que deve ser auditada:** inclua na migração
  `SELECT audit_enable('"NomeDaTabela"');`.
- **Tabela nova que a API não pode alterar** (como a `AuditLog`): acrescente a
  exceção em `prisma/configure-app-role.mjs` e rode `npm run db:app-role` de
  novo.
- **Nunca redefina** `audit_trusted_role()` em migrações (ver
  [`docs/auditoria.md`](auditoria.md), seção 5).

---

## 6. Configurar o usuário da API em um ambiente novo

Rode uma vez por ambiente, depois das migrações, com a `DIRECT_URL` do dono:

```bash
APP_DB_PASSWORD="<senha forte, 16+ caracteres>" npm run db:app-role
```

O script `prisma/configure-app-role.mjs`:

- cria o `tcc_app` (ou atualiza a senha, se já existir);
- aplica as permissões da seção 2;
- define o `tcc_app` como papel confiável da auditoria;
- confirma no final que o usuário não tem nenhum poder administrativo.

Ele pode ser executado de novo sem efeito colateral, por exemplo para trocar a
senha.

---

## 7. Conectar pelo pgAdmin

Em *Register → Server*, aba *Connection*:

- **Host:** o endereço **direto** da *branch*, sem `-pooler`, copiado do painel
  do Neon.
- **Port:** `5432` · **Database:** `tcc`
- **Username:** `tcc_app` para consultar, ou `tcc_owner` só para
  administração.

Na aba *Parameters*, defina **SSL mode** como `require`.

Alterações feitas pelo pgAdmin ficam registradas na auditoria com origem
`DATABASE`.

---

## 8. Containers (Compose)

O Compose continua com o PostgreSQL local, sem depender do Neon. O script
`scripts/create-container-env.mjs` agora também gera a `DIRECT_URL`, igual à
`DATABASE_URL`, porque o container de migração passou a precisar dela.

Rodar os containers apontando para o Neon ainda **não foi definido nem
testado**. A combinação fica para quando a hospedagem for escolhida, junto com
a frente de infraestrutura.

---

## 9. Cuidados com o plano gratuito

- **Pausa por inatividade:** o Neon desliga o servidor do banco depois de um
  tempo sem uso. A primeira consulta seguinte demora um pouco mais.
- **Restauração:** uma *branch* pode voltar a um momento anterior com
  `neonctl branches restore`, dentro da janela que o plano gratuito permite.
- **Testes de integração:** não rode contra a `dev` nem contra a `main`. Eles
  criam usuários de teste, inclusive um `ADMIN_RH`, o que impede a criação do
  administrador inicial. Use o PostgreSQL local ou uma *branch* temporária:

```bash
neonctl branches create --name teste-seu-nome --parent dev
# ... rodar os testes ...
neonctl branches delete teste-seu-nome
```

---

## 10. Verificações feitas na integração (12/10/2026)

- **Migrações:** as 13 aplicadas no Neon, incluindo os *triggers* e as funções
  da auditoria.
- **API:** completa rodando contra o Neon como `tcc_app`. Login, equipes,
  usuários, processos de *feedback*, aprovação e exclusão em cascata foram
  auditados corretamente.
- **Testes de integração da auditoria:** os 8 passaram contra o Neon.
- **Privilégios mínimos:** as tentativas de alterar a auditoria, ler as
  migrações, criar tabela, desativar *triggers* e redefinir o papel confiável
  foram todas negadas ao `tcc_app`.
- **Falsificação:** uma sessão do dono que se passou pela aplicação foi
  registrada como `DATABASE`, sem autor.
- **Isolamento das *branches*:** a senha da `main` não funciona na `dev`.
