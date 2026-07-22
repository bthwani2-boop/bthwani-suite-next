#!/usr/bin/env bash
set -u

EVIDENCE_DIR="${EVIDENCE_DIR:-governance/evidence/jrn037-ci}"
mkdir -p "${EVIDENCE_DIR}"
LOG_FILE="${EVIDENCE_DIR}/verification.log"
RESULT_FILE="${EVIDENCE_DIR}/result.env"
: > "${LOG_FILE}"
status=0

run_check() {
  local name="$1"
  shift
  echo "" | tee -a "${LOG_FILE}"
  echo "## ${name}" | tee -a "${LOG_FILE}"
  if "$@" 2>&1 | tee -a "${LOG_FILE}"; then
    echo "${name}=success" | tee -a "${LOG_FILE}"
  else
    echo "${name}=failure" | tee -a "${LOG_FILE}"
    status=1
  fi
}

run_migrations() {
  set -euo pipefail
  for migration in services/wlt/database/migrations/*.sql; do
    echo "applying ${migration}"
    psql -v ON_ERROR_STOP=1 -f "${migration}"
  done
}

run_gofmt_check() {
  local files=(
    services/wlt/backend/internal/payout/jrn037_governed_payout.go
    services/wlt/backend/internal/payout/jrn037_governed_payout_test.go
    services/wlt/backend/internal/payout/model_request.go
    services/wlt/backend/internal/payout/read_provider_proof.go
    services/wlt/backend/internal/http/server.go
    services/dsh/backend/internal/http/jrn037_payout_routes.go
    services/dsh/backend/internal/http/representative_finance_routes.go
    services/dsh/backend/internal/wlt/actor_finance_client.go
    services/dsh/backend/internal/wlt/finance_proxy.go
  )
  local unformatted
  unformatted="$(gofmt -l "${files[@]}")"
  if [[ -n "${unformatted}" ]]; then
    printf '%s\n' "${unformatted}"
    return 1
  fi
}

run_check source_normalization node tools/verification/jrn-037-normalize-source.mjs
run_check product_contract_surface_guard node tools/guards/jrn-037-payout-destination-gate.mjs
run_check all_wlt_migrations run_migrations
run_check postgresql_invariants psql -v ON_ERROR_STOP=1 -f services/wlt/database/tests/jrn-037-payout-destination-invariants.sql
run_check gofmt run_gofmt_check
run_check wlt_go_test bash -lc 'cd services/wlt/backend && go test ./internal/payout ./internal/http'
run_check dsh_go_test bash -lc 'cd services/dsh/backend && go test ./internal/http ./internal/wlt'
run_check dsh_typecheck pnpm --dir services/dsh typecheck
run_check backend_api_binding pnpm run guard:backend-api-binding
run_check frontend_feature_binding pnpm run guard:frontend-feature-binding
run_check whitespace git diff --check

printf 'JRN037_VERIFY_STATUS=%s\n' "${status}" > "${RESULT_FILE}"
exit "${status}"
