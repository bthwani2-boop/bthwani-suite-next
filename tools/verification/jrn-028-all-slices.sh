#!/usr/bin/env bash
set -Eeuo pipefail

failure_file="governance/evidence/JRN-028_LAST_FAILURE.txt"
mkdir -p "$(dirname "$failure_file")"
rm -f "$failure_file"

run_check() {
  local name="$1"
  shift
  local log_file
  log_file="$(mktemp)"
  printf 'JRN-028: %s\n' "$name"
  set +e
  "$@" > >(tee "$log_file") 2>&1
  local status=$?
  set -e
  if [[ "$status" -ne 0 ]]; then
    {
      printf 'status=FAILED\n'
      printf 'check=%s\n' "$name"
      printf 'exit_code=%s\n' "$status"
      printf 'command='
      printf '%q ' "$@"
      printf '\n'
      printf 'tested_sha=%s\n' "${GITHUB_SHA:-manual}"
      printf '%s\n' '--- output tail ---'
      tail -n 200 "$log_file"
    } > "$failure_file"
    rm -f "$log_file"
    return "$status"
  fi
  rm -f "$log_file"
}

run_check "WLT sovereign promotion-funding domain and handlers" bash -lc "cd services/wlt/backend && go test ./internal/promotionfunding ./internal/shared"
run_check "DSH funding projection, WLT adapter and durable outbox" bash -lc "cd services/dsh/backend && go test ./internal/coupons ./internal/wlt ./internal/promotionfundingoutbox"
run_check "FS-01 through FS-18 routes, structure and ownership assertions" node --test services/dsh/tests/jrn-028-promotion-funding.test.mjs
run_check "governed TypeScript surface" pnpm --dir services/dsh exec tsc -p tsconfig.jrn-028.json --noEmit --pretty false
run_check "WLT promotion-funding base schema" psql -X -q -v ON_ERROR_STOP=1 -f services/wlt/database/migrations/wlt-032_promotion_funding_ledger.sql
run_check "WLT JRN-028 audit-integrity controls" psql -X -q -v ON_ERROR_STOP=1 -f services/wlt/database/migrations/wlt-034_jrn_028_promotion_funding_audit_integrity.sql
run_check "governed promotion-funding tables" bash -lc "psql -X -q -v ON_ERROR_STOP=1 -Atc \"SELECT to_regclass('public.wlt_promotion_funding_reservations') IS NOT NULL\" | grep -qx t && psql -X -q -v ON_ERROR_STOP=1 -Atc \"SELECT to_regclass('public.wlt_promotion_funding_events') IS NOT NULL\" | grep -qx t"
run_check "reserve, commit, release, reverse and negative database invariants" bash services/wlt/database/tests/jrn-028-promotion-funding-integrity.sh
run_check "concurrent transition serialization" bash services/wlt/database/tests/jrn-028-promotion-funding-concurrency.sh
run_check "Product Truth gate" node tools/guards/product-truth-gate.mjs
run_check "compose canonical DSH OpenAPI bundle" pnpm --dir services/dsh openapi:compose
run_check "generate canonical DSH API client" pnpm --dir services/dsh openapi:generate
run_check "canonical DSH modular OpenAPI gate" node tools/guards/dsh-openapi-modular-gate.mjs
run_check "generated contract cleanliness" git diff --exit-code -- services/dsh/contracts/generated/dsh.bundle.openapi.yaml services/dsh/clients/generated/dsh-api.ts
run_check "repository whitespace" git diff --check

rm -f "$failure_file"
printf 'JRN-028 FS-01..FS-18 verification passed.\n'
