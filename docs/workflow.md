# Workflow de Desenvolvimento

Como a equipe trabalha no repositório no dia a dia. 

---

## 1. Princípios

Adotamos o **GitHub Flow**: `main` é a única branch permanente, sempre
pronta para deploy; todo trabalho vai em branches curtas; toda mudança
entra no `main` via Pull Request revisado.

Três regras inegociáveis:

1. **Ninguém commita direto no `main`.** Sempre via PR.
2. **Toda branch nasce de um `main` atualizado.**
3. **Nenhum PR entra sem pelo menos uma aprovação** de outro integrante.

> A regra 1 está configurada como Branch Protection Rule. Tentar
> `git push origin main` retorna `GH013: Repository rule violations`.

---

## 2. Setup inicial (uma vez por máquina)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git config --global pull.rebase true
```

O `pull.rebase true` evita commits de merge desnecessários e a tela do
Vim em divergências simples.

---

## 3. O ciclo de uma tarefa

### 3.1. Antes de começar

```bash
git checkout main
git pull origin main
```

Issues são opcionais — recomendadas para tarefas grandes; mudanças diretas
podem ir sem. Quando existir issue, use o número no nome da branch.

### 3.2. Criar a branch

```bash
git checkout -b feat/descricao-curta
# ou, com issue:
git checkout -b feat/12-cadastro-pessoa
```

Prefixos e exemplos em [§4](#4-convenção-de-nomes-de-branch).

### 3.3. Desenvolver e commitar

Commits pequenos e frequentes, sempre em **Conventional Commits**
([§5](#5-convenção-de-commits)):

```bash
git add <arquivos>
git commit -m "feat(cadastro): adiciona endpoint POST /pessoas"
```

### 3.4. Sincronizar durante o trabalho

Suba sua branch pelo menos 1x por dia:

```bash
git push origin feat/descricao-curta
```

No início de cada dia e antes de abrir o PR, atualize sua branch com o `main`:

```bash
git fetch origin
git rebase origin/main
```

Se já havia push anterior, o próximo precisa de `--force-with-lease` (mais
seguro que `--force` — recusa se outra pessoa commitou na branch):

```bash
git push --force-with-lease origin feat/descricao-curta
```

Conflitos, ver [§7](#7-resolução-de-conflitos).

### 3.5. Abrir o Pull Request

1. Branch atualizada com `main`.
2. Abra o PR no GitHub (sua branch → `main`).
3. Preencha o template (aparece automático).
4. Se houver issue: `Closes #N` na descrição fecha a issue no merge.
5. Marque 1 reviewer, preferencialmente quem entende da área:
   - Back-end → Fred · Front-end → Felipe · Testes → Leonardo
   - Infra/nuvem → Adriel · Docs, config, CI → Pedro
6. Feature grande e ainda não pronta → abra como **Draft PR**.

### 3.6. Revisão

- O GitHub não permite o autor aprovar o próprio PR.
- O reviewer avalia: faz o que a tarefa descreve? Está testado? Segue
  os padrões? Quebra algo existente?
- Comentários diretos no diff, em linhas específicas.
- Autor ajusta em novos commits.
- **Evite `--force-with-lease` após a revisão começar** — apaga o contexto
  dos comentários em linhas. Se for inevitável, avise o reviewer.

### 3.7. Merge

- **Squash and merge** como padrão: os commits da branch viram um só no
  `main`, histórico limpo.
- Título do commit segue Conventional Commits (o GitHub sugere a partir
  do título do PR).

> O pipeline de CI com GitHub Actions será configurado em outra frente.
> Quando ativo, a regra *Require status checks* será adicionada ao ruleset
> e PRs com CI vermelho ficarão bloqueados. Até lá, só a aprovação é
> bloqueante.

### 3.8. Depois do merge

```bash
git checkout main
git pull origin main
git branch -d feat/descricao-curta
```

A branch remota geralmente é apagada pelo botão *Delete branch* na página
do PR. Se não foi: `git push origin --delete feat/descricao-curta`.

---

## 4. Convenção de nomes de branch

Formato: `tipo/descricao-curta` (ou `tipo/N-descricao-curta` com issue).

| Prefixo    | Uso                                     | Exemplo                  |
|------------|-----------------------------------------|--------------------------|
| `feat/`    | Nova funcionalidade                     | `feat/cadastro-pessoa`   |
| `fix/`     | Correção de bug                         | `fix/validacao-cpf`      |
| `refactor/`| Refatoração sem mudar comportamento     | `refactor/extrai-mapper` |
| `docs/`    | Documentação                            | `docs/atualiza-workflow` |
| `test/`    | Testes                                  | `test/person-service`    |
| `chore/`   | Manutenção (deps, configs)              | `chore/atualiza-nest`    |
| `spike/`   | Experimentação descartável (sem PR)     | `spike/testa-orm`        |

Regras: minúsculas, hífen para separar palavras, sem acentos, 3-5 palavras.

---

## 5. Convenção de commits

**Conventional Commits**:

```
tipo(escopo): descrição em imperativo, minúscula, sem ponto final
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`,
`perf`, `style`.

Escopos comuns do projeto: `auth`, `cadastro`, `pessoa`, `competencia`,
`frontend`, `backend`, `infra`, `ci`.

Exemplos:

```
feat(auth): adiciona validação de token JWT
fix(cadastro): corrige erro de duplicidade no CPF
test(pessoa): adiciona testes de unidade para PersonService
refactor(backend): extrai PersonMapper para arquivo próprio
docs: atualiza README com instruções de setup
chore(deps): atualiza nestjs para 10.3.0
```

Por que importa: histórico legível, changelog automatizável, integração
trivial com versionamento semântico no futuro.

---

## 6. Cadência de sincronização

- **Commit**: várias vezes por dia (por unidade lógica fechada).
- **Push**: ao menos 1x/dia quando trabalhando na branch.
- **Rebase do `main` na sua branch**: início de cada dia e antes do PR.
- **Abrir PR**: assim que revisável. Draft cedo se for grande.
- **Merge**: só com aprovação (e CI verde, quando ativo).

Branches idealmente não vivem mais de **3-5 dias**. Se for inevitável,
abra Draft PR cedo.

---

## 7. Resolução de conflitos

```bash
git fetch origin
git rebase origin/main
# Git mostra os arquivos em conflito.
# Resolva os marcadores <<<<<<< ======= >>>>>>>
git add <arquivos-resolvidos>
git rebase --continue
git push --force-with-lease origin feat/descricao-curta
```

Se o conflito for grande ou envolver decisões de design, **converse com
quem mexeu no código conflitante** antes de resolver.

---

## 8. Casos especiais

- **Hotfix urgente**: ainda vai por PR. Avise no Discord, abra o PR com
  `fix/descricao-curta`, peça revisão rápida.
- **Mudança muito grande**: quebre em tarefas menores. Se não der, abra
  Draft PR cedo para o time acompanhar.
- **Experimentação**: branches `spike/descricao` podem ser descartadas
  com `git branch -D`. Nunca faça spike direto no `main`.

---

## 9. Proibições

- ❌ Commit direto no `main` (GitHub rejeita automaticamente).
- ❌ `git push --force` em branches compartilhadas. Use `--force-with-lease`
  apenas na sua própria branch, quando necessário.
- ❌ Merge de PR sem aprovação.
- ❌ Merge de PR com CI vermelho (quando ativo).
- ❌ Apagar histórico do `main`.

---

## 10. Dúvidas

Abra uma issue no repositório ou chame no Discord. Este documento é vivo:
se algo não estiver funcionando na prática, discutimos e atualizamos.
