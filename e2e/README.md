# Testes de ponta a ponta (E2E)

Estes testes usam o [Cypress](https://docs.cypress.io) para abrir o sistema em um navegador real e executar o que o usuário faz: o frontend, o backend e o PostgreSQL funcionam juntos. Ficam nesta pasta, com `package.json` próprio, para não alterar as dependências do `frontend/` nem do `backend/`.

## Segurança: só roda em banco de teste

Antes de cada teste, o banco é esvaziado e recebe um cenário conhecido. Por isso `support/test-database.js` confere a variável `DATABASE_URL`:

- o host precisa ser `localhost`, `127.0.0.1` ou `[::1]`;
- o nome do banco precisa terminar em `_test`.

Se a regra não for cumprida, o teste é abortado sem tocar no banco. É a mesma regra dos testes de integração (`backend/test/`).

## Cenário criado a cada teste

Uma equipe e três usuários, todos com a senha `Senha@123`:

| Perfil | E-mail |
|---|---|
| RH | `rh@teste.com` |
| Líder | `lider@teste.com` |
| Membro | `membro@teste.com` |

## O que é coberto hoje

- `login.cy.js`: líder, RH e membro entram e chegam ao painel do perfil; senha incorreta mostra o erro e mantém o login; o painel sem autenticação redireciona para o login.
- `permissoes.cy.js`: opções do menu lateral de cada perfil.
- `planejamento.cy.js`: o líder cria um planejamento e o envia para validação; o RH o abre e clica em "Validar planejamento"; o status passa de "Enviado para validação" a "Planejado".

A sessão de feedback ainda não é coberta: a tela de consulta (#37) vai mudar o fluxo.

## Como rodar

1. Suba um PostgreSQL de teste (exige o Docker). O nome do container e a porta são exemplos:

```bash
docker run -d --name tcc-pg-e2e -e POSTGRES_PASSWORD=senha-de-teste -e POSTGRES_DB=feedback_test -p 5435:5432 postgres:16
```

2. Em um terminal, na pasta `backend`, aplique as migrações e suba a API (PowerShell):

```powershell
$env:DATABASE_URL = "postgresql://postgres:senha-de-teste@localhost:5435/feedback_test"
$env:DIRECT_URL = $env:DATABASE_URL
$env:JWT_SECRET = "segredo-e2e-local"
$env:PORT = "3001"
$env:CORS_ORIGINS = "http://localhost:3000"
$env:OTEL_SDK_DISABLED = "true"
npx prisma migrate deploy
npm start
```

3. Em outro terminal, na pasta `frontend`:

```bash
npm start
```

4. Em um terceiro terminal, nesta pasta (`e2e`), com a mesma `DATABASE_URL` definida:

```powershell
$env:DATABASE_URL = "postgresql://postgres:senha-de-teste@localhost:5435/feedback_test"
npm ci
npm run e2e
```

`npm run open` abre a interface do Cypress para acompanhar os testes passo a passo. Para usar outra porta do frontend, defina `CYPRESS_BASE_URL`.

`npm run test:unit` testa apenas a trava do banco e não precisa de servidor.

Esta suíte ainda não roda no CI, porque precisa de um PostgreSQL de serviço e dos dois servidores no ar.
