# Contribuindo

Este projeto é um TCC em equipe. Antes de abrir seu primeiro PR, leia:

- [docs/workflow.md](docs/workflow.md) — como trabalhamos no dia a dia
  (branches, commits, PRs, revisão, merge).

## Resumo em 30 segundos

1. Crie uma **issue** (ou pegue uma existente) e anote o número `#N`.
2. `git checkout main && git pull`.
3. `git checkout -b tipo/N-descricao-curta` (ver tipos em `docs/workflow.md`).
4. Commits no padrão Conventional Commits:
   `tipo(escopo): descrição curta`.
5. `git push origin tipo/N-descricao-curta`.
6. Abra o PR para `main`, preencha o template, peça revisão.
7. Após aprovação + CI verde: **Squash and merge**.

## Setup do ambiente

Ver [README.md](readme.md) para instruções de instalação e execução.

## Dúvidas

Abra uma issue com label `discussão` ou chame no Discord da equipe.
