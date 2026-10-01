# CLAUDE.md

Guia para o Claude Code trabalhar neste repositório. Leia também
`docs/workflow.md` (fluxo de branches/commits/PRs) e
`docs/estrutura-repositorio.md` (política de pastas) quando a tarefa
envolver essas áreas.

## Projeto

TCC (equipe) — sistema de **processos de feedback** entre RH, líderes de
equipe e membros. Monorepo com dois subprojetos independentes, cada um com
seu próprio `package.json` e `package-lock.json`:

- `backend/` — API REST **NestJS 11 + TypeScript + Prisma 6 (PostgreSQL)**
- `frontend/` — SPA **React 19 (Create React App) + TypeScript + axios**

Idioma: código em inglês; textos de UI, mensagens de erro, commits e
documentação em **português**.

## Comandos

Sempre rode os comandos dentro do subprojeto (`cd backend` / `cd frontend`).

### Backend

```bash
npm ci
npx prisma generate          # obrigatório antes de tsc/build/test após mudar o schema
npm run start:dev            # API em http://localhost:3001/api/v1 (Swagger em /api)
npm run lint:ci              # ESLint sem --fix, igual ao CI
npm run lint                 # ESLint com --fix (inclui Prettier)
npx tsc --noEmit             # typecheck, igual ao CI
npm test                     # Jest (arquivos *.spec.ts em src/)
npm run test:cov             # igual ao CI
npx prisma migrate dev --name <nome>   # cria migration (precisa de DATABASE_URL)
```

### Frontend

```bash
npm ci
npm start                    # http://localhost:3000
npm run lint:ci              # igual ao CI
npx tsc --noEmit             # igual ao CI
CI=true npm test -- --watchAll=false   # nunca rode `npm test` sem isso: entra em watch mode
npm run build
```

### Antes de dar uma tarefa por concluída

Rode, no(s) subprojeto(s) alterado(s): `lint:ci`, `tsc --noEmit` e os
testes. O CI (`.github/workflows/`) roda exatamente isso em Node 24, mais
`npm audit --audit-level=high` e CodeQL.

## Variáveis de ambiente

Backend lê `backend/.env` (via `dotenv/config`). Modelo em
`backend/.env.example`. **Nunca** commite `.env`.

- `DATABASE_URL` — Postgres (obrigatória para rodar a API e migrations;
  testes unitários não precisam de banco).
- `JWT_SECRET` — tem fallback inseguro no código; defina sempre.
- `DEFAULT_ADMIN_RH_EMAIL` / `DEFAULT_ADMIN_RH_PASSWORD` — admin RH criado
  automaticamente no startup se não existir nenhum `ADMIN_RH`.

Frontend: `REACT_APP_API_URL` (opcional). Atenção: `frontend/src/services/api.ts`
tem a base `http://localhost:3001/api/v1` fixa.

## Arquitetura do backend

Arquitetura em camadas (decisão da equipe, ver `docs/estrutura-repositorio.md`):

```
src/
├── main.ts              prefixo global `api/v1`, CORS, Swagger, porta 3001
├── app.module.ts        módulo raiz
├── prisma.module.ts / prisma.service.ts   Prisma global + seed do admin RH
├── controllers/         HTTP apenas; sem regra de negócio
├── services/            regra de negócio (testes *.spec.ts ao lado)
├── dto/                 formato de entrada/saída da API
├── guards/              JwtAuthGuard, JwtStrategy, RolesGuard + @Roles()
└── modules/             um módulo Nest por funcionalidade
```

- Arquivos nomeados `<feature>.<tipo>.ts` (ex.: `feedback-process.service.ts`),
  organizados por **tipo** (pasta `controllers/`, `services/`...), não por feature.
- Ao criar uma feature: DTO em `dto/`, service em `services/`, controller em
  `controllers/`, módulo em `modules/` e registro em `app.module.ts`.
- Autorização: `@UseGuards(JwtAuthGuard)` na classe +
  `@Roles(...)` e `@UseGuards(RolesGuard)` por rota.
- Papéis (`UserRole` no Prisma): `ADMIN_RH`, `ADMIN_LEADER` (líder de equipe),
  `TEAM_MEMBER`.
- Swagger: use `@ApiTags` / `@ApiBearerAuth` nos controllers.
- Testes unitários mockam o `PrismaService` — não dependem de banco.
- Estilo: Prettier com aspas simples e trailing comma (`backend/.prettierrc`);
  ESLint (`eslint.config.mjs`) tem regra de `complexity`.

### Prisma

- `prisma/schema.prisma` é a fonte da verdade do modelo de dados.
- Mudou o schema → crie migration com `prisma migrate dev` (pasta com
  timestamp em `prisma/migrations/`, versionada). **Não edite migrations já
  mergeadas**; crie uma nova.
- `migration_lock.toml` está no `.gitignore` (decisão em aberto).

## Arquitetura do frontend

```
src/
├── App.tsx       AuthProvider + troca Login/Dashboard (sem react-router)
├── pages/        uma página por arquivo (testes *.test.tsx ao lado)
├── services/     TODA chamada HTTP passa por aqui (axios em api.ts, token JWT
│                 do localStorage `auth_token` injetado por interceptor)
├── hooks/        useAuth, useLoader
└── styles/       um CSS por página
```

Componentes nunca chamam `fetch`/axios direto — sempre via `services/`.
Testes com Testing Library + jest-dom.

## Fluxo Git (resumo de `docs/workflow.md`)

- `main` protegida: nada direto no `main`, tudo via PR com 1 aprovação;
  merge por **Squash and merge**.
- Branch: `tipo/descricao-curta` (minúsculas, hífen, sem acento), tipos
  `feat|fix|refactor|docs|test|chore|spike`.
- Commits em **Conventional Commits**, em português, imperativo, minúsculo,
  sem ponto final: `feat(auth): adiciona validação de token JWT`.
  Escopos comuns: `auth`, `cadastro`, `processo`, `frontend`, `backend`,
  `infra`, `ci`.
- PRs seguem `.github/pull_request_template.md`.
- Não use `git push --force`; só `--force-with-lease` na própria branch.

## Cuidados

- Não commitar `.env`, `node_modules/`, `dist/`, `build/`, `coverage/`.
- Commitar `package-lock.json` quando mudar dependências (use `npm install`
  no subprojeto certo, nunca na raiz).
- Arquivos em `docs/` (`.docx`, `.pdf`, `.png`, `.drawio`) são artefatos da
  disciplina — não altere sem pedido explícito.
- Pasta nova no código exige atualizar `docs/estrutura-repositorio.md` no
  mesmo PR.
