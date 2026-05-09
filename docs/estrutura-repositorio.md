# Estrutura e Controle de Armazenamento

Política de armazenamento de artefatos do projeto. Faz parte da Gerência de
Configuração e responde à dimensão de *controle de armazenamento* da disciplina.

> Para o fluxo operacional (branches, commits, PRs, revisão), veja
> [`docs/workflow.md`](workflow.md).

---

## 1. Visão geral

Monorepo com dois subprojetos independentes que se comunicam por API:

- `backend/` — API REST em **NestJS + TypeScript** com **Prisma** sobre Postgres
- `frontend/` — SPA em **React (CRA) + TypeScript**

Um único histórico, um único fluxo de PR, uma única configuração de Branch
Protection. Cada subprojeto tem `package.json` próprio e ciclo de build
independente.

---

## 2. Estrutura raiz

```
tcc20261/
├── .github/             ← templates, configurações e workflows do GitHub
├── backend/             ← aplicação NestJS + Prisma
├── docs/                ← documentação técnica e diagramas do projeto
├── frontend/            ← aplicação React
├── .gitignore           ← regras de exclusão do controle de versão
├── CONTRIBUTING.md      ← guia de entrada para contribuidores
└── readme.md            ← descrição inicial do projeto
```

Documentos de "porta de entrada" ficam visíveis na raiz; documentação
detalhada em `docs/`; configurações da plataforma em `.github/`.

### 2.1. Pasta `.github/`

Contém artefatos reconhecidos automaticamente pelo GitHub:

| Arquivo | Status | Função |
|---|---|---|
| `pull_request_template.md` | ✅ ativo | Aplicado em todo novo PR |
| `workflows/lint.yml` | ✅ ativo | Pipeline de ESLint para backend e frontend |
| `workflows/codeql.yml` | ✅ ativo | Análise de segurança CodeQL |
| `ISSUE_TEMPLATE/` | 🔜 futuro | Templates de bug e feature |
| `CODEOWNERS` | 🔜 futuro | Mapeia pastas a responsáveis |

### 2.2. Pasta `docs/`

Documentação técnica e diagramas do projeto. Mistura formatos:

- **Markdown (`.md`)** para texto técnico legível no GitHub
- **PNG** para visualização rápida de diagramas
- **`.drawio`** como formato fonte editável dos diagramas
- **`.docx` / `.pdf`** para descrições textuais elaboradas

```
docs/
├── workflow.md
├── estrutura-repositorio.md         ← este documento
├── Descrição da Arquitetura/        ← descritivo da arquitetura (.docx + .pdf)
├── Descrição dos Casos de Uso/      ← descritivo dos casos de uso (.docx)
├── Diagrama de Atividades/          ← diagrama de atividades (.png)
├── Diagrama de Caso de Uso/         ← diagrama de casos de uso (.png)
├── Diagrama de Implantação/         ← diagrama de implantação (.drawio + .png)
└── Diagrama de Pacotes/             ← diagrama de pacotes (.drawio + 2 .png)
```

Cada diagrama tem o **arquivo fonte** (`.drawio` ou `.docx`) e a **versão
exportada** (`.png` ou `.pdf`) — assim o time pode visualizar rápido sem
precisar abrir a ferramenta, e ainda assim manter a edição versionável.

**Convenção de nomes**: pastas dentro de `docs/` usam capitalização e
espaços para legibilidade (são leituras humanas, não caminhos de código).
Já as pastas de código continuam em minúsculas com hífen.

---

## 3. Backend

### 3.1. Estrutura

```
backend/
├── package.json, tsconfig.json, nest-cli.json, eslint.config.mjs
├── prisma.config.ts          ← configuração do Prisma para o NestJS
├── README.md
├── prisma/                   ← schema e migrations do banco
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── main.ts               ← ponto de entrada
    ├── app.module.ts         ← módulo raiz
    ├── prisma.module.ts      ← módulo Prisma (injeção de dependência)
    ├── prisma.service.ts     ← serviço Prisma (acesso ao client)
    ├── controllers/          ← entrada da API
    ├── dto/                  ← formato dos dados da API
    ├── models/               ← entidades de domínio
    ├── modules/              ← agrupadores de funcionalidade
    ├── repositories/         ← acesso a dados via Prisma
    └── services/             ← lógica de negócio
```

### 3.2. Justificativa por pasta

Arquitetura em camadas decidida na reunião de 04/04/2026:

- **`controllers/`** — recebe requisição HTTP, valida dados básicos, delega
  ao service. Não contém regra de negócio.
- **`services/`** — lógica de negócio, intermediário entre controller e
  repository. Testável isoladamente sem precisar de banco.
- **`repositories/`** — acesso a dados via Prisma. Concentra leituras,
  escritas e validações de unicidade. Isolar aqui permite trocar a
  tecnologia de persistência sem refazer a camada de negócio.
- **`models/`** — entidades de domínio (`Person`, `Competence`).
- **`dto/`** — *Data Transfer Objects*. Formato dos dados na API. Separar
  de `models` permite que a API evolua independentemente do domínio interno.
- **`modules/`** — cada módulo NestJS agrupa controller + service +
  repository de uma entidade. Centraliza injeção de dependências.
- **`app.module.ts`** — raiz da árvore de módulos.
- **`prisma.module.ts` e `prisma.service.ts`** — módulo e serviço globais
  que disponibilizam o Prisma Client via injeção de dependência. Vivem em
  `src/` (não em pasta própria) por serem componentes infraestruturais
  reutilizados por todos os repositories.

### 3.3. Pasta `prisma/`

Convenção do Prisma — **deve ficar na raiz do subprojeto backend**:

- **`schema.prisma`** — fonte única de verdade do modelo de dados. Define
  entidades, relações, índices e provider do banco.
- **`migrations/`** — pastas com timestamp, geradas automaticamente pelo
  comando `prisma migrate dev`. Cada migration contém o SQL aplicado e é
  versionada no repositório para garantir reprodutibilidade entre
  ambientes.

> **Particularidade**: o arquivo `migrations/migration_lock.toml` está
> atualmente listado no `.gitignore`. Isso é incomum — a recomendação
> oficial do Prisma é versionar este arquivo, pois ele garante que toda a
> equipe usa o mesmo provider de banco. **A confirmar com o responsável
> pela camada de banco** se foi decisão deliberada ou pode ser revertido.

### 3.4. Pastas futuras no backend

| Pasta | Quando | Convenção |
|---|---|---|
| `test/` | Testes E2E | Padrão NestJS |
| `src/**/*.spec.ts` | Testes unitários | Co-localizados com o código testado |

### 3.5. Variáveis de ambiente

`.env` real **nunca** é commitado. Um `.env.example` versionado lista os
nomes das variáveis com valores em branco. Cada desenvolvedor cria seu
`.env` local a partir do exemplo.

A `DATABASE_URL` é a variável crítica do backend, usada pelo Prisma para
conectar ao Postgres.

---

## 4. Frontend

### 4.1. Estrutura

```
frontend/
├── package.json, tsconfig.json
├── README.md
├── public/              ← assets estáticos
└── src/
    ├── index.tsx, App.tsx, index.css
    ├── hooks/           ← hooks customizados
    ├── pages/           ← páginas da aplicação
    └── services/        ← chamadas ao backend
```

### 4.2. Justificativa por pasta

- **`pages/`** — cada arquivo é uma página completa, geralmente associada a
  uma rota. Hoje contém `PersonPage.tsx` e `CadastroPessoa.tsx`.
- **`services/`** — centraliza todas as chamadas HTTP ao backend.
  Componentes nunca chamam `fetch` direto. Facilita tratamento global de
  erros, autenticação, troca de URL entre ambientes.
- **`hooks/`** — reutilização de lógica entre componentes (estado, side
  effects, integração com APIs). Hoje contém `useLoader.ts`.

### 4.3. Pastas futuras

| Pasta | Quando | Função |
|---|---|---|
| `components/` | Quando houver componentes reutilizáveis | Botões, cards, layouts compartilhados |
| `assets/` | Se imagens próprias forem necessárias | Assets pequenos referenciados em código |
| `*.test.tsx` | Implementação de testes | Co-localizados (Testing Library) |

`public/` é padrão CRA para arquivos servidos diretamente sem passar pelo
bundler — não usar para imagens referenciadas em código.

---

## 5. Integração contínua (CI)

O repositório tem **GitHub Actions ativo** com dois workflows:

- **`lint.yml`** — executa ESLint sobre backend e frontend a cada push e
  PR. Detecta erros de estilo e padrões antes do merge.
- **`codeql.yml`** — análise estática de segurança fornecida pelo próprio
  GitHub. Detecta vulnerabilidades comuns no código TypeScript.

**Status atual no ruleset do `main`**: a regra *Require status checks to
pass* ainda **não está ativa**. Ou seja, hoje os checks rodam e mostram o
resultado, mas não bloqueiam o merge. Será ativada quando os checks
estiverem estáveis e o time tiver experiência com o pipeline.

---

## 6. O que NÃO entra no repositório

### Segredos
`.env` reais, senhas, tokens, chaves privadas, certificados, backups com
dados reais, dumps de produção, logs de aplicação. Substituir por
`.env.example` com valores em branco.

> Se um segredo for commitado por engano, ele está comprometido. Apagar o
> arquivo no commit seguinte não basta — o histórico Git ainda contém o
> valor. **Rotacionar** (trocar a senha/token na origem) e avisar a equipe.

### Builds e dependências (regeneráveis)
`node_modules/`, `dist/`, `build/`, `coverage/`, `*.log`.

### Arquivos pessoais e de OS
`.vscode/`, `.idea/`, `*.swp`, `.DS_Store`, `Thumbs.db`, `*.local`.

### Lockfiles
`package-lock.json` **deve ser commitado** em ambos os subprojetos. Garante
que toda a equipe instale as mesmas versões — essencial para
reprodutibilidade.

O `.gitignore` da raiz cobre tudo isso. Modificações nele seguem o fluxo
normal de PR.

---

## 7. Versionamento e baseline

Conventional Commits para mensagens (em `workflow.md`). Para marcar pontos
relevantes, usamos **tags Git**:

| Tag | Significado |
|---|---|
| `v0.1-tcc1` | Versão entregue na apresentação do TCC1 |
| `v1.0-tcc2` | Versão final do TCC2 |
| `v1.0-defesa` | Versão usada na defesa |

Criação:

```bash
git checkout main
git pull origin main
git tag -a v0.1-tcc1 -m "Versão entregue para apresentação do TCC1"
git push origin v0.1-tcc1
```

Tags viram releases na aba *Releases* do GitHub, com possibilidade de
anexar artefatos (slides, PDF do TCC).

---

## 8. Artefatos não-código

Estado atual do que já está decidido e do que falta alinhar:

| Artefato | Onde vive | Status |
|---|---|---|
| Diagramas técnicos | Repo (`docs/Diagrama de.../`) | ✅ definido |
| Descrição da arquitetura | Repo (`docs/Descrição da Arquitetura/`) | ✅ definido |
| Descrição dos casos de uso | Repo (`docs/Descrição dos Casos de Uso/`) | ✅ definido |
| Texto do TCC | A definir | 🔜 TODO |
| Slides de apresentação | A definir | 🔜 TODO |
| Atas e gravações | Drive (presumido) | 🔜 confirmar |
| Dataset/seeds de teste | Provavelmente `backend/prisma/seeds/` | 🔜 a criar |

> **TODO** — Alinhar com a Profa. Adriana, no 1:1 oferecido por ela, onde
> ficam o texto do TCC, slides e gravações. A prática atual indica que
> diagramas técnicos e descrições estão sendo armazenados no repositório,
> o que valida a recomendação inicial.

---

## 9. Auditoria de armazenamento

> **TODO** — Definir auditor e processo. Pendência da reunião de 25/04/2026.

Verificação periódica de que os artefatos seguem esta política:

- Arquivos em pastas corretas
- Nenhum segredo commitado
- `.gitignore` continua cobrindo tudo
- Pastas novas têm justificativa documentada
- Lockfiles versionados e atualizados
- Diagramas têm formato fonte versionado (não só PNG)

**Princípio**: a auditoria não pode ser feita pelo responsável pela GCS
(segregação de responsabilidades — Prof. Juliano, 21/03/2026). Auditor
deve ser outro integrante.

**Frequência sugerida**: antes de cada baseline.

---

## 10. Mudanças nesta estrutura

Estrutura não é fixa, evolui com o projeto.

**Adicionar pasta nova**: issue ou PR descrevendo o que vai conter e por
que não cabe em pasta existente. O responsável pela GCS revisa. Se
aprovado, a pasta e este documento são atualizados **no mesmo PR**.

**Mudar função de pasta existente ou remover**: discussão prévia (reunião
ou Discord). Após consenso, atualização aqui + comunicação no Discord.
Remoção exige decidir o destino do conteúdo.

---

## 11. Referências

- Reunião 28/03/2026 — definição inicial do `src/`
- Reunião 04/04/2026 — apresentação da arquitetura por Frederick
- Reunião 14/03/2026 — escolha do Postgres + Prisma
- Reunião 25/04/2026 — controle de armazenamento como prioridade
- Documentação oficial do NestJS, Prisma e Create React App
