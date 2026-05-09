# Estrutura e Controle de Armazenamento

Política de armazenamento de artefatos do projeto. Faz parte da Gerência de
Configuração e responde à dimensão de *controle de armazenamento* da disciplina.

> Para o fluxo operacional (branches, commits, PRs, revisão), veja
> [`docs/workflow.md`](workflow.md).

---

## 1. Visão geral

Monorepo com dois subprojetos independentes que se comunicam por API:

- `backend/` — API REST em **NestJS + TypeScript**
- `frontend/` — SPA em **React (CRA) + TypeScript**

Um único histórico, um único fluxo de PR, uma única configuração de Branch
Protection. Cada subprojeto tem `package.json` próprio e ciclo de build
independente.

---

## 2. Estrutura raiz

```
tcc20261/
├── .github/             ← templates, configurações e workflows do GitHub
├── backend/             ← aplicação NestJS
├── docs/                ← documentação técnica do projeto
├── frontend/            ← aplicação React
├── .gitignore           ← regras de exclusão do controle de versão
├── CONTRIBUTING.md      ← guia de entrada para contribuidores
└── readme.md            ← descrição inicial do projeto
```

Documentos de "porta de entrada" ficam visíveis na raiz; documentação
detalhada em `docs/`; configurações da plataforma em `.github/`.

### `.github/`

| Arquivo | Status | Função |
|---|---|---|
| `pull_request_template.md` | ✅ existe | Aplicado em todo novo PR |
| `ISSUE_TEMPLATE/` | 🔜 futuro | Templates de bug e feature |
| `CODEOWNERS` | 🔜 futuro | Mapeia pastas a responsáveis |
| `workflows/` | 🔜 futuro | Pipelines de CI/CD (frente do CI) |

### `docs/`

Documentação técnica em Markdown — legível no GitHub, versionável, editável
em qualquer ferramenta. Hoje contém `workflow.md` e este documento.

---

## 3. Backend

### 3.1. Estrutura

```
backend/
├── package.json, tsconfig.json, nest-cli.json, eslint.config.mjs
├── README.md
└── src/
    ├── main.ts              ← ponto de entrada
    ├── app.module.ts        ← módulo raiz
    ├── controllers/         ← entrada da API
    ├── dto/                 ← formato dos dados da API
    ├── models/              ← entidades de domínio
    ├── modules/             ← agrupadores de funcionalidade
    ├── repositories/        ← acesso a dados
    └── services/            ← lógica de negócio
```

### 3.2. Justificativa por pasta

Arquitetura em camadas decidida na reunião de 04/04/2026:

- **`controllers/`** — recebe requisição HTTP, valida dados básicos, delega
  ao service. Não contém regra de negócio.
- **`services/`** — lógica de negócio, intermediário entre controller e
  repository. Testável isoladamente sem precisar de banco.
- **`repositories/`** — acesso a dados (leituras, escritas, validações de
  unicidade, relações). Isolar aqui permite trocar a tecnologia de
  persistência sem refazer a camada de negócio.
- **`models/`** — entidades de domínio (`Person`, `Competence`).
- **`dto/`** — *Data Transfer Objects*. Formato dos dados na API. Separar
  de `models` permite que a API evolua independentemente do domínio interno.
- **`modules/`** — cada módulo NestJS agrupa controller + service +
  repository de uma entidade. Centraliza injeção de dependências.
- **`app.module.ts`** — raiz da árvore de módulos.

### 3.3. Pastas futuras

| Pasta | Quando | Convenção |
|---|---|---|
| `prisma/` | Integração Prisma | `schema.prisma` na raiz, `migrations/` dentro |
| `test/` | Testes E2E | Padrão NestJS |
| `src/**/*.spec.ts` | Testes unitários | Co-localizados com o código testado |

### 3.4. Variáveis de ambiente

`.env` real **nunca** é commitado. Um `.env.example` versionado lista os
nomes das variáveis com valores em branco. Cada desenvolvedor cria seu
`.env` local a partir do exemplo.

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
  uma rota.
- **`services/`** — centraliza todas as chamadas HTTP ao backend.
  Componentes nunca chamam `fetch` direto. Facilita tratamento global de
  erros, autenticação, troca de URL entre ambientes.
- **`hooks/`** — reutilização de lógica entre componentes (estado, side
  effects, integração com APIs).

### 4.3. Pastas futuras

| Pasta | Quando | Função |
|---|---|---|
| `components/` | Quando houver componentes reutilizáveis | Botões, cards, layouts compartilhados |
| `assets/` | Se imagens próprias forem necessárias | Assets pequenos referenciados em código |
| `*.test.tsx` | Implementação de testes | Co-localizados (Testing Library) |

`public/` é padrão CRA para arquivos servidos diretamente sem passar pelo
bundler — não usar para imagens referenciadas em código.

---

## 5. O que NÃO entra no repositório

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

## 6. Versionamento e baseline

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

## 7. Artefatos não-código

> **TODO** — Alinhar com a Profa. Adriana na próxima reunião 1:1.

| Artefato | Possíveis localizações |
|---|---|
| Texto do TCC | Drive, Overleaf ou repo |
| Slides de apresentação | Drive ou repo |
| Atas e gravações | Drive |
| Diagramas técnicos | Repo (em `docs/`, formato fonte) |
| Dataset/seeds | Repo, em `backend/prisma/seeds/` (a confirmar) |

Recomendação inicial a validar: diagramas técnicos no repo (Mermaid,
draw.io); TCC, slides e gravações no Drive da orientação; dataset/seeds no
repo.

---

## 8. Auditoria de armazenamento

> **TODO** — Definir auditor e processo. Pendência da reunião de 25/04/2026.

Verificação periódica de que os artefatos seguem esta política:

- Arquivos em pastas corretas
- Nenhum segredo commitado
- `.gitignore` continua cobrindo tudo
- Pastas novas têm justificativa documentada
- Lockfiles versionados e atualizados

**Princípio**: a auditoria não pode ser feita pelo responsável pela GCS
(segregação de responsabilidades — Prof. Juliano, 21/03/2026). Auditor
deve ser outro integrante.

**Frequência sugerida**: antes de cada baseline.

---

## 9. Mudanças nesta estrutura

Estrutura não é fixa, evolui com o projeto.

**Adicionar pasta nova**: issue ou PR descrevendo o que vai conter e por
que não cabe em pasta existente. O responsável pela GCS revisa. Se
aprovado, a pasta e este documento são atualizados **no mesmo PR**.

**Mudar função de pasta existente ou remover**: discussão prévia (reunião
ou Discord). Após consenso, atualização aqui + comunicação no Discord.
Remoção exige decidir o destino do conteúdo.

---

## 10. Referências

- Reunião 28/03/2026 — definição inicial do `src/`
- Reunião 04/04/2026 — apresentação da arquitetura por Frederick
- Reunião 14/03/2026 — escolha do Postgres + Prisma
- Reunião 25/04/2026 — controle de armazenamento como prioridade
- Documentação oficial do NestJS, Prisma e Create React App
