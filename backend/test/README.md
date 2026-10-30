# Testes de integração

Estes testes sobem a aplicação NestJS completa e enviam pedidos HTTP reais (Jest e Supertest) contra um PostgreSQL de teste. Conferem login, token JWT, guards e o acesso ao banco funcionando juntos. Os testes de unidade, que simulam o banco, continuam em `src/` e rodam com `npm test`.

## Segurança: só roda em banco de teste

Os testes **apagam os dados** das tabelas do sistema. Por isso, antes de qualquer migração ou teste, a trava de `test/test-database.ts` confere `DATABASE_URL` e `DIRECT_URL`:

- o host precisa ser `localhost`, `127.0.0.1` ou `[::1]`;
- o nome do banco precisa terminar em `_test`.

Se qualquer uma das duas variáveis não cumprir a regra, tudo é abortado sem tocar no banco. As variáveis precisam estar definidas no terminal: a trava não lê o `.env`, para que o banco de desenvolvimento ou o Neon nunca sejam usados por engano.

## Como rodar

1. Suba um PostgreSQL de teste (exige o Docker). O nome do container e a porta são exemplos:

```bash
docker run -d --name tcc-pg-test -e POSTGRES_PASSWORD=senha-de-teste -e POSTGRES_DB=feedback_test -p 5433:5432 postgres:16
```

2. No terminal, na pasta `backend`, defina as duas variáveis (PowerShell):

```powershell
$env:DATABASE_URL = "postgresql://postgres:senha-de-teste@localhost:5433/feedback_test"
$env:DIRECT_URL = $env:DATABASE_URL
```

3. Rode:

```bash
npm run test:integration
```

O script confere o banco, aplica as migrações (`prisma migrate deploy`) e roda os testes em sequência.

## O que é coberto hoje

- `POST /api/v1/auth/login`: sucesso (201, com token e sem a senha) e recusa de senha incorreta ou e-mail inexistente (401, com a mesma mensagem).
- `GET /api/v1/auth/users`, rota exclusiva do RH: sem token e com token inválido (401), membro e líder (403) e RH (200, com os usuários do banco).
- `test-database.spec.ts`: a trava do banco de teste.

Esta suíte não roda no CI, porque precisa de um banco.
