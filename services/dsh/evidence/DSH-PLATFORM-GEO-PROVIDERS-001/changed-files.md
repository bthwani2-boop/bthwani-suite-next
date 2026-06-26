# Changed Files — DSH-PLATFORM-GEO-PROVIDERS-001

## Created — shared/platform (Provider Registry Brain)
- services/dsh/frontend/shared/platform/platform-provider.types.ts
- services/dsh/frontend/shared/platform/platform-provider.policy.ts
- services/dsh/frontend/shared/platform/platform-provider.registry.ts
- services/dsh/frontend/shared/platform/platform-provider-public-config.ts
- services/dsh/frontend/shared/platform/platform-provider-visibility.policy.ts
- services/dsh/frontend/shared/platform/platform-provider-health.types.ts
- services/dsh/frontend/shared/platform/platform-provider-audit.types.ts
- services/dsh/frontend/shared/platform/platform-provider-secrets.policy.ts
- services/dsh/frontend/shared/platform/index.ts

## Created — shared/geo (Geo Policy Brain)
- services/dsh/frontend/shared/geo/geo.types.ts
- services/dsh/frontend/shared/geo/geo.policy.ts
- services/dsh/frontend/shared/geo/geo.customer-visibility.policy.ts
- services/dsh/frontend/shared/geo/geo.operational-checkpoint.types.ts
- services/dsh/frontend/shared/geo/geo.status-updates.ts
- services/dsh/frontend/shared/geo/geo.map-provider.contract.ts
- services/dsh/frontend/shared/geo/geo.heatmap.types.ts
- services/dsh/frontend/shared/geo/index.ts

## Created — control-panel/platform (Consumer UI)
- services/dsh/frontend/control-panel/platform/ProviderRegistryPanel.tsx
- services/dsh/frontend/control-panel/platform/MapsProviderInspector.tsx

## Created — Guard
- tools/guards/dsh-platform-geo-provider-governance-gate.mjs

## Created — Tests
- services/dsh/tests/platform-provider.policy.test.mjs
- services/dsh/tests/geo.customer-visibility.policy.test.mjs
- services/dsh/tests/geo.operational-checkpoint.policy.test.mjs
- services/dsh/tests/provider-secret-visibility.test.mjs
- services/dsh/tests/geo.status-updates.test.mjs
- services/dsh/tests/wlt-boundary-provider.test.mjs

## Modified (existing)
- services/dsh/contracts/dsh.openapi.yaml — removed "live delivery tracking" from client endpoint summary
- services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx — replaced live-tracking terminology
- services/dsh/frontend/control-panel/platform/index.ts — added ProviderRegistryPanel + MapsProviderInspector exports
- package.json — added guard:dsh-platform-geo-provider-governance script

## Explicitly NOT Changed
- services/dsh/frontend/shared/dispatch/dispatch.types.ts — DshDispatchAssignment already has no coordinates
- services/dsh/frontend/app-captain/ — no GPS/watchPosition found, clean
- services/wlt/frontend/shared/dsh/ — WLT boundary confirmed, no DSH provider imports
- Backend Go code — client tracking endpoint already returns status-only DshDispatchAssignment
