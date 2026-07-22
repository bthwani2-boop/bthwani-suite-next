#!/usr/bin/env bash
set -Eeuo pipefail

failure_file="governance/evidence/JRN-028_LAST_FAILURE.txt"
mkdir -p "$(dirname "$failure_file")"
rm -f "$failure_file"

on_error() {
  local status=$?
  {
    printf 'status=FAILED\n'
    printf 'exit_code=%s\n' "$status"
    printf 'line=%s\n' "${BASH_LINENO[0]:-unknown}"
    printf 'command=%s\n' "$BASH_COMMAND"
    printf 'tested_sha=%s\n' "${GITHUB_SHA:-manual}"
  } > "$failure_file"
  exit "$status"
}
trap on_error ERR

printf 'JRN-028: WLT sovereign funding tests\n'
(
  cd services/wlt/backend
  go test ./internal/promotionfunding ./internal/shared
  go test ./internal/http -run '^$'
)

printf 'JRN-028: DSH projection, reconciliation and durable outbox tests\n'
(
  cd services/dsh/backend
  go test ./internal/coupons ./internal/wlt ./internal/promotionfundingoutbox
  go test ./internal/http -run '^$'
)

printf 'JRN-028: FS-01..FS-18 structural and ownership assertions\n'
node --test services/dsh/tests/jrn-028-promotion-funding.test.mjs

printf 'JRN-028: governed TypeScript surface\n'
pnpm --dir services/dsh exec tsc -p tsconfig.jrn-028.json --noEmit --pretty false

printf 'JRN-028: PostgreSQL schema and audit-integrity controls\n'
psql -X -q -v ON_ERROR_STOP=1 -f services/wlt/database/migrations/wlt-032_promotion_funding_ledger.sql
psql -X -q -v ON_ERROR_STOP=1 -f services/wlt/database/migrations/wlt-034_jrn_028_promotion_funding_audit_integrity.sql
psql -X -q -v ON_ERROR_STOP=1 -Atc "SELECT to_regclass('public.wlt_promotion_funding_reservations') IS NOT NULL" | grep -qx t
psql -X -q -v ON_ERROR_STOP=1 -Atc "SELECT to_regclass('public.wlt_promotion_funding_events') IS NOT NULL" | grep -qx t

printf 'JRN-028: reserve/commit/release/reverse and negative database invariants\n'
bash services/wlt/database/tests/jrn-028-promotion-funding-integrity.sh

printf 'JRN-028: concurrent transition serialization\n'
bash services/wlt/database/tests/jrn-028-promotion-funding-concurrency.sh

printf 'JRN-028: Product Truth and canonical DSH contracts\n'
node tools/guards/product-truth-gate.mjs
node tools/guards/dsh-openapi-modular-gate.mjs
pnpm --dir services/dsh openapi:generate
git diff --exit-code -- services/dsh/contracts/generated/dsh.bundle.openapi.yaml services/dsh/clients/generated/dsh-api.ts

printf 'JRN-028: repository whitespace\n'
git diff --check

rm -f "$failure_file"
printf 'JRN-028 FS-01..FS-18 verification passed.\n'
