#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
engine=${CONTAINER_ENGINE:-podman}
case "$engine" in
  podman|docker) ;;
  *) echo 'CONTAINER_ENGINE deve ser podman ou docker.' >&2; exit 1 ;;
esac

"$engine" info >/dev/null
"$engine" compose version
node --test --test-isolation=none "$project_root/tests/container-env.test.mjs"

test_dir=$(mktemp -d)
project_name="tcc-verify-$(date +%s)-$$"
compose_ready=0
compose() {
  local deadline=180
  if [[ "$1" == build ]]; then deadline=900; fi
  timeout --signal=TERM --kill-after=10s "$deadline" \
    "$engine" compose --env-file "$test_dir/.env" -f "$project_root/compose.yaml" -p "$project_name" "$@"
}
cleanup() {
  local result=$?
  if (( compose_ready )); then
    if (( result != 0 )); then compose logs --tail=80 >&2 || true; fi
    # Este projeto e volume foram criados exclusivamente para este teste.
    compose down --volumes || result=1
  fi
  rm -rf -- "$test_dir"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node "$project_root/scripts/create-container-env.mjs" "$test_dir/.env"
# Arquivo gerado por este teste: nomes fixos e segredos hexadecimais.
set -a
source "$test_dir/.env"
set +a
export WEB_PORT=${TEST_WEB_PORT:-18080}
base_url="http://127.0.0.1:$WEB_PORT"
compose config >/dev/null
compose_ready=1

for service in backend frontend; do
  "$engine" build --target test -f "$project_root/$service/Containerfile" \
    -t "localhost/tcc20261-$service-test:local" "$project_root/$service"
  "$engine" run --rm "localhost/tcc20261-$service-test:local"
done
compose build
compose up -d

wait_for_api() {
  for ((attempt = 0; attempt < 90; attempt++)); do
    if curl --fail --silent --max-time 3 "$base_url/api/v1/auth/teams" >/dev/null; then return; fi
    sleep 2
  done
  echo 'A API não ficou pronta no tempo esperado.' >&2
  return 1
}
wait_for_api
compose run --rm --no-deps migrate ./node_modules/.bin/prisma migrate status
node "$project_root/scripts/smoke-containers.mjs" create "$base_url" "$test_dir/.env" "$test_dir/state.json"

# down preserva o volume; o segundo up executa novamente migrate deploy.
compose down
compose up -d
wait_for_api
node "$project_root/scripts/smoke-containers.mjs" verify "$base_url" "$test_dir/.env" "$test_dir/state.json"
echo 'Validação de containers concluída.'
