#!/usr/bin/env bash
set -Eeuo pipefail

stage="bootstrap"
artifact_dir="artifacts/order-preparation-slice1"
mkdir -p "$artifact_dir"

record_failure() {
  local exit_code=$?
  printf 'stage=%s\nsource_sha=%s\nexit_code=%s\n' "$stage" "$(git rev-parse HEAD)" "$exit_code" > "$artifact_dir/failure.txt"
  exit "$exit_code"
}
trap record_failure ERR

stage="apply"
python tools/scripts/patch-order-preparation-slice1-corrections.py
python tools/scripts/patch-order-preparation-slice1.py
gofmt -w \
  services/dsh/backend/internal/http/server.go \
  services/dsh/backend/internal/http/partner_order_workboard.go \
  services/dsh/backend/internal/http/partner_order_workboard_test.go

stage="contract"
pnpm run openapi:generate:dsh
grep -F '/dsh/partner/order-workboard:' services/dsh/contracts/dsh.openapi.yaml
grep -F 'DshPartnerOrderAction:' services/dsh/contracts/dsh.openapi.yaml
grep -F 'DshPartnerOrderWorkboardOrder:' services/dsh/contracts/dsh.openapi.yaml
grep -F 'DshPartnerOrderWorkboardResponse:' services/dsh/contracts/dsh.openapi.yaml
grep -F 'getDshPartnerOrderWorkboard' services/dsh/clients/generated/dsh-api.ts
grep -F 'allowedActions' services/dsh/clients/generated/dsh-api.ts

stage="backend"
(
  cd services/dsh/backend
  go test ./internal/http -run '^TestPartnerOrderAllowedActions$' -count=1 -v
  go test ./internal/orders ./internal/http ./cmd/dsh-api -run '^$' -count=1
)

stage="typecheck"
status=0
for config in \
  apps/app-partner/runtime/tsconfig.order-journey.json \
  apps/app-client/runtime/tsconfig.order-journey.json \
  apps/app-captain/runtime/tsconfig.order-journey.json \
  apps/control-panel/runtime/tsconfig.order-journey.json
do
  echo "=== TYPECHECK $config ==="
  pnpm exec tsc -p "$config" --noEmit --pretty false || status=1
done
test "$status" -eq 0

stage="runtime"
server=services/dsh/backend/internal/http/server.go
workboard=services/dsh/backend/internal/http/partner_order_workboard.go
adapter=services/dsh/frontend/shared/partner/partner.adapters.ts
commands=services/dsh/frontend/app-partner/orders/usePartnerOrderCommands.ts
operational=services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx
decision=services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx
grep -F 'GET /dsh/partner/order-workboard' "$server"
grep -F 'partnerOrderAllowedActions' "$workboard"
grep -F 'order.AllowedActions' "$workboard"
grep -F 'missing server allowedActions' "$adapter"
grep -F "allowedActions.includes('prepare')" "$commands"
grep -F 'item.allowedActions' "$operational"
grep -F 'canAccept={canAccept}' "$decision"
! grep -R -F 'handleMarkReady' \
  services/dsh/frontend/app-partner/orders/usePartnerOrdersRuntime.ts \
  services/dsh/frontend/app-partner/orders/usePartnerOrdersModel.ts \
  services/dsh/frontend/app-partner/useDshPartnerSurfaceModel.ts \
  services/dsh/frontend/app-partner/DshPartnerSurface.tsx \
  services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx
! grep -F 'fetchPartnerOrders(storeId' services/dsh/frontend/shared/orders/use-orders-controller.ts
! grep -Ei '(mock|fixture|demo)[A-Za-z0-9_]*[[:space:]]*=' \
  services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx \
  services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx \
  services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx \
  services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx

stage="cleanup"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
rm -f .github/order-preparation-slice1-failure
git rm -f \
  .github/workflows/order-preparation-slice1.yml \
  tools/scripts/patch-order-preparation-slice1.py \
  tools/scripts/patch-order-preparation-slice1-corrections.py \
  tools/scripts/run-order-preparation-slice1.sh
git add -A
git commit -m "feat(order-preparation): enforce server-authoritative partner actions [skip ci]"
git push origin HEAD:journey/order-preparation-handoff-closure
