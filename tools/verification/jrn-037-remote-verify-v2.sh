#!/usr/bin/env bash
set -uo pipefail

EVIDENCE_DIR="${EVIDENCE_DIR:-governance/evidence/jrn037-ci-v2}"
mkdir -p "${EVIDENCE_DIR}"
LOG_FILE="${EVIDENCE_DIR}/verification.log"
RESULT_FILE="${EVIDENCE_DIR}/result.env"
: >"${LOG_FILE}"
status=0

run_check() {
  local name="$1"
  shift
  printf '\n## %s\n' "$name" | tee -a "$LOG_FILE"
  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    printf '%s=success\n' "$name" | tee -a "$LOG_FILE"
  else
    printf '%s=failure\n' "$name" | tee -a "$LOG_FILE"
    status=1
  fi
}

format_jrn037_go() {
  gofmt -w \
    services/wlt/backend/internal/payout/jrn037_governed_payout.go \
    services/wlt/backend/internal/payout/jrn037_governed_payout_test.go \
    services/wlt/backend/internal/payout/jrn037_legacy_destination_adapter.go \
    services/wlt/backend/internal/payout/jrn037_provider_process.go \
    services/wlt/backend/internal/payout/jrn037_provider_process_test.go \
    services/wlt/backend/internal/payout/model_request.go \
    services/wlt/backend/internal/payout/read_provider_proof.go \
    services/wlt/backend/internal/http/server.go \
    services/dsh/backend/internal/http/jrn037_payout_routes.go \
    services/dsh/backend/internal/http/actor_finance_handlers.go \
    services/dsh/backend/internal/http/representative_finance_routes.go \
    services/dsh/backend/internal/wlt/actor_finance_client.go \
    services/dsh/backend/internal/wlt/finance_proxy.go
}

apply_wlt_migrations() {
  set -euo pipefail
  for migration in services/wlt/database/migrations/*.sql; do
    echo "applying ${migration}"
    psql -v ON_ERROR_STOP=1 -f "$migration"
  done
}

run_runtime_smoke() {
  local container_name="jrn037-v2-wiremock-${GITHUB_RUN_ID:-local}-$$"
  local runtime_log="${EVIDENCE_DIR}/wlt-runtime.log"
  local wlt_pid=""
  local smoke_status=0

  docker run --detach --rm \
    --name "$container_name" \
    --publish 127.0.0.1:58090:8080 \
    --volume "$PWD/infra/docker/financial-simulators/wiremock/mappings:/home/wiremock/mappings:ro" \
    --volume "$PWD/infra/docker/financial-simulators/wiremock/__files:/home/wiremock/__files:ro" \
    wiremock/wiremock:3.13.2 \
    --global-response-templating --verbose >/dev/null || return 1

  (
    cd services/wlt/backend || exit 1
    env \
      PORT=58083 \
      DATABASE_URL="$DATABASE_URL" \
      WLT_AUTH_MODE=service \
      WLT_MUTATIONS_ENABLED=true \
      WLT_DSH_SERVICE_TOKEN=jrn037-ci-service-token \
      WLT_PAYOUT_ENCRYPTION_KEY=jrn037-ci-encryption-key-not-for-production \
      WLT_FINANCIAL_PROVIDER_MODE=mock \
      WLT_ALLOW_MOCK_PROVIDER=true \
      WLT_FINANCIAL_PROVIDER_BASE_URL=http://127.0.0.1:58090 \
      go run ./cmd/wlt-api
  ) >"$runtime_log" 2>&1 &
  wlt_pid=$!

  WLT_BASE_URL=http://127.0.0.1:58083 \
  WLT_SERVICE_TOKEN=jrn037-ci-service-token \
    bash tools/verification/jrn-037-runtime-smoke.sh || smoke_status=$?

  if [[ -n "$wlt_pid" ]]; then
    kill "$wlt_pid" >/dev/null 2>&1 || true
    wait "$wlt_pid" >/dev/null 2>&1 || true
  fi
  docker rm --force "$container_name" >/dev/null 2>&1 || true

  if [[ "$smoke_status" -ne 0 ]]; then
    echo "WLT runtime log:"
    cat "$runtime_log" || true
  fi
  return "$smoke_status"
}

run_check gofmt format_jrn037_go
run_check product_contract_surface_guard node tools/guards/jrn-037-payout-destination-gate.mjs
run_check all_wlt_migrations apply_wlt_migrations
run_check postgresql_invariants psql -v ON_ERROR_STOP=1 -f services/wlt/database/tests/jrn-037-payout-destination-invariants.sql
run_check wlt_go_test bash -lc 'cd services/wlt/backend && go test ./internal/payout ./internal/http'
run_check dsh_go_test bash -lc 'cd services/dsh/backend && go test ./internal/http ./internal/wlt'
run_check provider_backed_runtime_smoke run_runtime_smoke
run_check dsh_typecheck pnpm --dir services/dsh typecheck
run_check backend_api_binding pnpm run guard:backend-api-binding
run_check frontend_feature_binding pnpm run guard:frontend-feature-binding
run_check whitespace git diff --check

printf 'JRN037_VERIFY_STATUS=%s\n' "$status" >"$RESULT_FILE"
exit "$status"
