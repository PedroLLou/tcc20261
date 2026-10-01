#!/bin/bash
# Instala dependências ao iniciar uma sessão do Claude Code na web,
# para que lint, typecheck e testes funcionem sem passos manuais.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

(cd backend && npm install --no-audit --no-fund && npx prisma generate)
(cd frontend && npm install --no-audit --no-fund)
