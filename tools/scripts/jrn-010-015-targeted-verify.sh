#!/usr/bin/env bash
set -euo pipefail

stage() {
  printf '%s\n' "$1" > /tmp/jrn-verification-stage
  printf '=== %s ===\n' "$1"
}

stage create-journey-tsconfigs
mkdir -p .tmp services/dsh/.tmp
cat > .tmp/jrn-010-015.tsconfig.json <<'JSON'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "files": [
    "../services/dsh/frontend/css-modules.d.ts",
    "../services/dsh/frontend/shared/checkout/use-checkout-controller.tsx",
    "../services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx",
    "../services/dsh/frontend/shared/orders/use-client-order-journey-controller.ts",
    "../services/dsh/frontend/shared/orders/use-partner-order-commands.ts",
    "../services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx",
    "../services/dsh/frontend/app-client/orders/useClientOrderJourneyController.ts",
    "../services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx",
    "../services/dsh/frontend/app-partner/orders/usePartnerOrderCommands.ts",
    "../services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx",
    "../services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx",
    "../services/dsh/frontend/shared/dispatch/use-dispatch-controller.ts",
    "../services/dsh/frontend/shared/delivery/captain-inbox.mapper.ts",
    "../services/dsh/frontend/shared/delivery/captain-inbox.model.ts",
    "../services/dsh/frontend/app-captain/dispatch/DshCaptainOrdersScreen.tsx",
    "../services/dsh/frontend/control-panel/operations/OrderJourneyDispatchAssignmentScreen.tsx",
    "../services/dsh/frontend/shared/pickup/use-pickup-controller.tsx",
    "../services/dsh/frontend/control-panel/operations/PickupWorkbenchScreen.tsx"
  ]
}
JSON

cat > services/dsh/.tmp/jrn-010-015-test-build.tsconfig.json <<'JSON'
{
  "extends": "../tsconfig.json",
  "include": [],
  "exclude": [],
  "files": [
    "../frontend/shared/checkout/checkout.controller-core.ts",
    "../frontend/shared/delivery/captain-inbox.mapper.ts"
  ]
}
JSON

stage typecheck-journey-files
pnpm exec tsc --noEmit -p .tmp/jrn-010-015.tsconfig.json

stage build-journey-test-modules
rm -rf services/dsh/dist
pnpm exec tsc -p services/dsh/.tmp/jrn-010-015-test-build.tsconfig.json

stage journey-contract-tests
node --test \
  services/dsh/tests/checkout-controller-core.test.mjs \
  services/dsh/tests/order-preparation-contract.test.mjs \
  services/dsh/tests/captain-inbox-exclusion.test.mjs

stage affected-boundaries
node tools/guards/jrn-010-015-affected-boundary.mjs

stage complete
