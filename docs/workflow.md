# Workflow de Desenvolvimento

Este documento descreve **como** a equipe trabalha no repositório no dia a dia.
Para a fundamentação teórica dessas escolhas (GitFlow vs. GitHub Flow vs.
Trunk-Based, etc.), veja o TCC1 de Gerência de Configuração.

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

## 2. O ciclo de uma tarefa

### 2.1. Antes de começar

```bash
git checkout main
git pull origin main
```

Se não houver ainda, crie uma **issue** descrevendo a tarefa e anote o número
(vamos chamar de `#N`).

### 2.2. Criar a branch

```bash
git checkout -b feat/N-descricao-curta
```

O prefixo vem da tabela em [§3](#3-convenção-de-nomes-de-branch). O `N` é o
número da issue. Exemplos reais para o nosso projeto:

- `feat/12-cadastro-pessoa`
- `fix/18-validacao-cpf`
- `test/23-person-service-unit`
- `docs/5-atualiza-workflow`

### 2.3. Desenvolver e commitar

Commits pequenos e frequentes, sempre no padrão **Conventional Commits**
(veja [§4](#4-convenção-de-commits)):

```bash
git add <arquivos>
git commit -m "feat(cadastro): adiciona endpoint POST /pessoas"
```

### 2.4. Sincronizar durante o trabalho

**Pelo menos uma vez por dia** (ou ao terminar a sessão), suba sua branch:

```bash
git push origin feat/N-descricao-curta
```

Se a tarefa durar mais de 1 ou 2 dias, atualize a branch com o `main` pelo
menos uma vez por dia para evitar que ela fique velha:

```bash
git fetch origin
git rebase origin/main
# ou, se preferir:
git merge origin/main
```

Se houver conflito, resolva localmente antes de continuar (veja
[§6](#6-resolução-de-conflitos)).

### 2.5. Abrir o Pull Request

Quando a tarefa estiver pronta para revisão:

1. Certifique-se de que a branch está atualizada com o `main`.
2. No GitHub, abra o PR da sua branch para `main`.
3. Preencha o **template de PR** (ele aparece automático).
4. Vincule a issue escrevendo `Closes #N` na descrição — isso fecha a
   issue automaticamente quando o PR for mergeado.
5. Marque pelo menos **1 reviewer**.
6. Se a feature é grande e ainda não está pronta, abra como **Draft PR**
   e marque como "Ready for review" quando terminar.

### 2.6. Revisão

- O autor **não aprova o próprio PR**.
- O reviewer avalia: o código faz o que a issue descreve? Está testado?
  Segue os padrões? Quebra alguma coisa que já funcionava?
- Comentários são feitos direto no diff, em linhas específicas.
- O autor responde aos comentários e faz os ajustes em novos commits
  (não force-push depois que a revisão começou — isso apaga o contexto
  dos comentários).

### 2.7. Merge

Quando o PR tem aprovação e o CI passou:

- Use **"Squash and merge"** como padrão (todos os commits da branch
  viram um só no `main`, deixando o histórico limpo).
- O título do commit de merge segue a convenção de commits (o GitHub
  sugere automaticamente a partir do título do PR).

### 2.8. Depois do merge

```bash
git checkout main
git pull origin main
git branch -d feat/N-descricao-curta       # apaga local
git push origin --delete feat/N-descricao-curta  # apaga remota
```

Branches antigas não ficam poluindo o repositório.

---

## 3. Convenção de nomes de branch

Formato: `tipo/N-descricao-curta`

| Prefixo    | Quando usar                                    |
|------------|------------------------------------------------|
| `feat/`    | Nova funcionalidade                            |
| `fix/`     | Correção de bug                                |
| `refactor/`| Melhoria de código sem mudar comportamento     |
| `docs/`    | Mudanças só em documentação                    |
| `test/`    | Adicionar ou ajustar testes                    |
| `chore/`   | Manutenção (deps, configs, scripts)            |

Regras:

- Minúsculas, hífen para separar palavras, sem acentos.
- Descrição curta (3 a 5 palavras), o suficiente para identificar.
- Sempre incluir o número da issue quando existir.

---

## 4. Convenção de commits

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

## 5. Cadência de sincronização

O trade-off é simples: sincronizar pouco gera conflitos grandes e difíceis;
sincronizar demais atrapalha o foco. O meio-termo que adotamos:

- **Commit**: várias vezes por dia, sempre que fechar uma unidade lógica
  (uma função, um teste, um ajuste que compila).
- **Push da branch**: ao menos 1x por dia quando estiver trabalhando nela
  (backup e visibilidade para o time).
- **Pull do `main` na sua branch**: no início de cada dia de trabalho e
  antes de abrir o PR.
- **Abrir PR**: assim que a tarefa estiver revisável. Se for grande, abra
  como Draft cedo para o time ver o progresso.
- **Merge do PR no `main`**: só depois de aprovação + CI verde.

Branches não devem viver mais de **3 a 5 dias**. Se passar disso,
provavelmente a tarefa é grande demais e deve ser quebrada em issues
menores.

---

## 6. Resolução de conflitos

Conflito aparece quando a sua branch e o `main` alteraram o mesmo trecho
de código. O fluxo:

```bash
git fetch origin
git rebase origin/main
# Git mostra os arquivos em conflito.
# Abra cada um, resolva manualmente os marcadores <<<<<<< ======= >>>>>>>
git add <arquivos-resolvidos>
git rebase --continue
git push --force-with-lease origin feat/N-descricao-curta
```

> `--force-with-lease` é mais seguro que `--force`: ele recusa o push se
> alguém tiver commitado na branch enquanto você rebasava.

Se o conflito for grande ou envolver decisões de design, **converse com
quem mexeu no código conflitante** antes de resolver. Conflito resolvido
mecanicamente pode mascarar decisões conflitantes.

---

## 7. Casos especiais

### 7.1. Mudança urgente em produção (hotfix)

Mesmo assim, vai por PR. A diferença é a prioridade: avisa o time no
Discord, abre o PR com `fix/N-descricao`, pede revisão rápida.

### 7.2. Mudança muito grande

Quebra em issues menores. Se não der, abre **Draft PR cedo** e vai
empurrando commits. O time vê o progresso e pode sugerir ajustes antes
da revisão final.

### 7.3. Experimentação

Branches `spike/descricao` não precisam virar PR — podem ser descartadas.
Mas **nunca** faça spike direto no `main`.

---

## 8. Proibições

- ❌ Commit direto no `main`.
- ❌ `git push --force` em branches compartilhadas (use `--force-with-lease`
  apenas na sua própria branch, e só quando necessário).
- ❌ Merge de PR sem aprovação.
- ❌ Merge de PR com CI vermelho.
- ❌ Apagar histórico do `main`.

---

## 9. Dúvidas

Qualquer dúvida sobre o workflow, abre uma issue com label `discussão` ou
chama no Discord. Este documento é vivo: se algo não estiver funcionando
na prática, a gente discute e atualiza.
