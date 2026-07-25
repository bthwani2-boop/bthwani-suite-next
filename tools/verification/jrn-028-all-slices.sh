#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "${ROOT_DIR}"

EXPECTED_HEAD="51eeb68af04ce05644512345a7e0d528fa37b686"
CURRENT_HEAD="$(git rev-parse HEAD)"
if [[ "${CURRENT_HEAD}" != "${EXPECTED_HEAD}" ]]; then
  echo "JRN-028 exact-head gate failed: expected ${EXPECTED_HEAD}, got ${CURRENT_HEAD}" >&2
  exit 1
fi

required_files=(
  "governance/product/JRN-028_PROMOTION_FUNDING_PRODUCT_TRUTH.md"
  "governance/evidence/JRN-028_ALL_SLICES_CLOSURE.json"
  "services/wlt/database/migrations/wlt-096_jrn_028_promotion_funding_audit_integrity.sql"
  "services/wlt/database/tests/jrn-028-promotion-funding-integrity.sh"
  "services/wlt/database/tests/jrn-028-promotion-funding-concurrency.sh"
  "services/wlt/backend/internal/promotionfunding/reservation_json.go"
  "services/wlt/backend/internal/shared/serviceauth.go"
  "services/wlt/contracts/wlt.promotion-funding.openapi.yaml"
  "services/dsh/contracts/dsh.marketing-commercial.openapi.yaml"
  "services/dsh/backend/internal/wlt/promotion_funding_read.go"
  "services/dsh/backend/internal/coupons/funding_diagnostics.go"
  "services/dsh/backend/internal/http/coupon_funding_lifecycle.go"
  "services/dsh/frontend/shared/marketing/coupons.types.ts"
  "services/dsh/frontend/shared/marketing/use-coupons-controller.ts"
  "services/dsh/frontend/control-panel/marketing/components/CouponFundingReconciliationPanel.tsx"
  "services/dsh/tests/jrn-028-promotion-funding.test.mjs"
)

for file in "${required_files[@]}"; do
  if [[ ! -s "${file}" ]]; then
    echo "JRN-028 missing required file: ${file}" >&2
    exit 1
  fi
done

node tools/guards/product-truth-gate.mjs
pnpm --dir services/dsh openapi:compose
pnpm --dir services/dsh test -- --test-name-pattern="JRN-028"
services/wlt/database/tests/jrn-028-promotion-funding-integrity.sh
services/wlt/database/tests/jrn-028-promotion-funding-concurrency.sh
git diff --check

echo "JRN-028 all slices exact-head gate passed."
