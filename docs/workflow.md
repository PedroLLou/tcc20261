# Workflow de Desenvolvimento

Este documento descreve **como** a equipe trabalha no repositório no dia a dia.

---

## 1. Princípios

Adotamos o **GitHub Flow**. Em uma frase: `main` é a única branch permanente,
sempre pronta para deploy; todo trabalho é feito em branches curtas; toda
mudança entra no `main` por Pull Request revisado.

Três regras inegociáveis:

1. **Ninguém commita direto no `main`.** Sempre via PR.
2. **Toda branch nasce de um `main` atualizado** e volta pra lá por PR.
3. **Nenhum PR entra sem pelo menos uma aprovação** de outro integrante.

---

## 2. Setup inicial (uma vez por máquina)

Antes de fazer o primeiro commit, configure sua identidade e um ajuste de
pull que evita complicações comuns:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git config --global pull.rebase true
```

O `pull.rebase true` faz o `git pull` usar rebase em vez de merge, evitando
commits de merge desnecessários e a tela do editor Vim quando há
divergência simples entre local e remoto.

---

## 3. O ciclo de uma tarefa

### 3.1. Antes de começar

Atualize seu `main` local:

```bash
git checkout main
git pull origin main
```

**Opcionalmente**, crie uma **issue** no GitHub descrevendo a tarefa. Issues são
recomendadas para tarefas grandes ou que merecem discussão prévia; para
mudanças diretas (ajuste pequeno, correção óbvia) pode ir direto pra
branch. Quando existir issue, anote o número (vamos chamar de `#N`) e
use-o no nome da branch.

### 3.2. Criar a branch

```bash
git checkout -b feat/descricao-curta
# ou, se houver issue associada:
git checkout -b feat/12-cadastro-pessoa
```

O prefixo vem da tabela em [§4](#4-convenção-de-nomes-de-branch).
Exemplos válidos para o nosso projeto:

- `feat/cadastro-pessoa` (sem issue)
- `feat/12-cadastro-pessoa` (com issue #12)
- `fix/validacao-cpf`
- `test/person-service-unit`
- `docs/atualiza-workflow`

### 3.3. Desenvolver e commitar

Commits pequenos e frequentes, sempre no padrão **Conventional Commits**
(veja [§5](#5-convenção-de-commits)):

```bash
git add <arquivos>
git commit -m "feat(cadastro): adiciona endpoint POST /pessoas"
```

### 3.4. Sincronizar durante o trabalho

**Pelo menos uma vez por dia**, suba sua branch:

```bash
git push origin feat/descricao-curta
```

**No início de cada dia de trabalho**, e antes de abrir o PR, atualize sua
branch com o `main`:

```bash
git fetch origin
git rebase origin/main
```

Se você já tinha pushado a branch antes do rebase, o próximo push vai
precisar de `--force-with-lease` porque o rebase reescreveu commits:

```bash
git push --force-with-lease origin feat/descricao-curta
```

> `--force-with-lease` é mais seguro que `--force` puro: ele recusa o push
> se alguém tiver commitado na sua branch enquanto você rebasava.

Se houver conflito durante o rebase, resolva localmente antes de continuar
(veja [§7](#7-resolução-de-conflitos)).

### 3.5. Abrir o Pull Request

Quando a tarefa estiver pronta para revisão:

1. Certifique-se de que a branch está atualizada com o `main`.
2. No GitHub, abra o PR da sua branch para `main`.
3. Preencha o **template de PR** (ele aparece automático).
4. Se houver issue associada, vincule com `Closes #N` na descrição —
   isso fecha a issue automaticamente quando o PR for mergeado.
5. Marque **pelo menos 1 reviewer**. Prefira quem entende da área do
   código alterado:
   - Back-end → Fred
   - Front-end → Felipe
   - Testes → Leonardo
   - Infra/nuvem → Adriel
   - Docs, config de repo, CI → Pedro
6. Se a feature é grande e ainda não está pronta, abra como **Draft PR**
   e marque como "Ready for review" quando terminar.

### 3.6. Revisão

- O autor **não aprova o próprio PR** (o GitHub não permite).
- O reviewer avalia: o código faz o que a tarefa descreve? Está testado?
  Segue os padrões? Quebra alguma coisa que já funcionava?
- Comentários são feitos direto no diff, em linhas específicas.
- O autor responde aos comentários e faz os ajustes em novos commits.
- **Evite `--force-with-lease` depois que a revisão começou** — isso
  pode apagar o contexto dos comentários em linhas específicas. Se for
  inevitável (ex: precisa rebasear pra resolver conflito novo), avise
  o reviewer antes.

### 3.7. Merge

Quando o PR tem aprovação (e o CI passar, quando estiver ativo):

- Use **"Squash and merge"** como padrão. Todos os commits da branch
  viram um só no `main`, deixando o histórico limpo.
- O título do commit de merge segue Conventional Commits (o GitHub
  sugere automaticamente a partir do título do PR).

> O pipeline de CI com GitHub Actions será configurado como responsabilidade
> do integrante de CI/CD. Quando estiver ativo, a regra *Require status
> checks* será adicionada ao ruleset e PRs com CI vermelho ficarão
> bloqueados. Até lá, só a aprovação é bloqueante.

### 3.8. Depois do merge

```bash
git checkout main
git pull origin main
git branch -d feat/descricao-curta
```

A branch remota normalmente já é apagada pelo botão *Delete branch* na
própria página do PR mergeado. Se por algum motivo não foi, rode:

```bash
git push origin --delete feat/descricao-curta
```

Branches antigas não ficam poluindo o repositório.

---

## 4. Convenção de nomes de branch

Formato base: `tipo/descricao-curta`

Com issue associada: `tipo/N-descricao-curta`

| Prefixo    | Quando usar                                    | Exemplo                       |
|------------|------------------------------------------------|-------------------------------|
| `feat/`    | Nova funcionalidade                            | `feat/cadastro-pessoa`        |
| `fix/`     | Correção de bug                                | `fix/validacao-cpf`           |
| `refactor/`| Melhoria de código sem mudar comportamento     | `refactor/extrai-mapper`      |
| `docs/`    | Mudanças só em documentação                    | `docs/atualiza-workflow`      |
| `test/`    | Adicionar ou ajustar testes                    | `test/person-service`         |
| `chore/`   | Manutenção (deps, configs, scripts)            | `chore/atualiza-nest`         |
| `spike/`   | Experimentação descartável (não vira PR)       | `spike/testa-orm`             |

Regras:

- Minúsculas, hífen para separar palavras, sem acentos.
- Descrição curta (3 a 5 palavras), o suficiente para identificar.
- Número da issue entre o prefixo e a descrição quando houver.

---

## 5. Convenção de commits

Adotamos **Conventional Commits**:

```
tipo(escopo): descrição em imperativo, minúscula, sem ponto final
```

Tipos aceitos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`,
`ci`, `perf`, `style`.

O **escopo** é opcional e identifica a área afetada. Para este projeto,
escopos comuns são: `auth`, `cadastro`, `pessoa`, `competencia`,
`frontend`, `backend`, `infra`, `ci`.

Exemplos válidos:

```
feat(auth): adiciona validação de token JWT
fix(cadastro): corrige erro de duplicidade no CPF
test(pessoa): adiciona testes de unidade para PersonService
refactor(backend): extrai PersonMapper para arquivo próprio
docs: atualiza README com instruções de setup
chore(deps): atualiza nestjs para 10.3.0
```

Por que isso importa: o histórico fica legível, a geração de changelog
pode ser automatizada e a integração com ferramentas de versionamento
semântico fica trivial no futuro.

---

## 6. Cadência de sincronização

O trade-off é simples: sincronizar pouco gera conflitos grandes e difíceis;
sincronizar demais atrapalha o foco. O meio-termo que adotamos:

- **Commit**: várias vezes por dia, sempre que fechar uma unidade lógica
  (uma função, um teste, um ajuste que compila).
- **Push da branch**: ao menos 1x por dia quando estiver trabalhando nela
  (backup e visibilidade para o time).
- **Rebase do `main` na sua branch**: no início de cada dia de trabalho
  e antes de abrir o PR.
- **Abrir PR**: assim que a tarefa estiver revisável. Se for grande, abra
  como Draft cedo para o time ver o progresso.
- **Merge do PR no `main`**: só depois de aprovação (e CI verde, quando
  estiver ativo).

Branches idealmente não vivem mais de **3 a 5 dias**. Se for inevitável,
abra Draft PR cedo para o time acompanhar.

---

## 7. Resolução de conflitos

Conflito aparece quando a sua branch e o `main` alteraram o mesmo trecho
de código. O fluxo:

```bash
git fetch origin
git rebase origin/main
# Git mostra os arquivos em conflito.
# Abra cada um, resolva manualmente os marcadores <<<<<<< ======= >>>>>>>
git add <arquivos-resolvidos>
git rebase --continue
git push --force-with-lease origin feat/descricao-curta
```

Se o conflito for grande ou envolver decisões de design, **converse com
quem mexeu no código conflitante** antes de resolver. Conflito resolvido
mecanicamente pode mascarar decisões conflitantes.

---

## 8. Casos especiais

### 8.1. Mudança urgente em produção (hotfix)

Mesmo assim, vai por PR. A diferença é a prioridade: avisa o time no
Discord, abre o PR com `fix/descricao-curta`, pede revisão rápida.

### 8.2. Mudança muito grande

Quebra em tarefas menores. Se não der, abre **Draft PR cedo** e vai
empurrando commits. O time vê o progresso e pode sugerir ajustes antes
da revisão final.

### 8.3. Experimentação

Branches `spike/descricao` não precisam virar PR — podem ser descartadas
com `git branch -D` quando acabar o experimento. Mas **nunca** faça spike
direto no `main`.

---

## 9. Proibições

- ❌ Commit direto no `main` (o GitHub rejeita automaticamente).
- ❌ `git push --force` em branches compartilhadas. Use
  `--force-with-lease` apenas na sua própria branch, e só quando
  necessário (após rebase).
- ❌ Merge de PR sem aprovação.
- ❌ Merge de PR com CI vermelho (quando o CI estiver ativo).
- ❌ Apagar histórico do `main`.

---

## 10. Dúvidas

Qualquer dúvida sobre o workflow, abre uma issue no repositório ou chama
no Discord. Este documento é vivo: se algo não estiver funcionando na
prática, a gente discute e atualiza.
