# Contribuindo

Este projeto é um TCC em equipe. Antes de abrir seu primeiro PR, leia:

- [docs/workflow.md](docs/workflow.md) — como trabalhamos no dia a dia
  (branches, commits, PRs, revisão, merge).

## Resumo em 30 segundos

1. (Opcional) Crie ou pegue uma **issue** e anote o número `#N` — recomendado
   para tarefas grandes; mudanças diretas podem ir sem issue.
2. `git checkout main && git pull`.
3. `git checkout -b tipo/descricao-curta` (ou `tipo/N-descricao-curta` se
   houver issue). Ver tipos em `docs/workflow.md`.
4. Commits no padrão Conventional Commits:
   `tipo(escopo): descrição curta`.
5. `git push origin tipo/descricao-curta`.
6. Abra o PR para `main`, preencha o template, peça revisão.
7. Após aprovação (e CI verde, quando estiver ativo): **Squash and merge**.

## Setup do ambiente

Ver [readme.md](readme.md) para instruções de instalação e execução.

## Dúvidas

Abra uma issue com label `discussão` ou chame no Discord da equipe.
