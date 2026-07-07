# Operational Journey Inventory

head_sha: `62945c2a88d495e43baa9605d9e3c2e6ae57a49e`
status: `DISCOVERY_ONLY`

## Source Files
- service_blueprint: `services/dsh/SERVICE_BLUEPRINT.md` exists=true
- service_manifest: `services/dsh/service.manifest.ts` exists=true
- runtime_map: `services/dsh/runtime-map.ts` exists=true
- capability_map: `services/dsh/capability-map.ts` exists=true
- dsh_operational_registry: `services/dsh/frontend/shared/operations/dsh-operational-registry.ts` exists=true
- cross_surface_closure_map: `services/dsh/frontend/shared/runtime/dsh-cross-surface-closure-map.ts` exists=true
- dsh_openapi: `services/dsh/contracts/dsh.openapi.yaml` exists=true
- wlt_openapi: `services/wlt/contracts/wlt.openapi.yaml` exists=true
- identity_openapi: `core/identity/contracts/auth.openapi.yaml` exists=true

## Counts
- OpenAPI files: 5
- generated clients: 4
- backend route candidates: 29
- frontend surface candidates: 132
- proposed smart journey groups: 5
- proposed unfilled journeys: 206

## Smart Segmentation Policy
- Unit: business outcome across full-stack multi-surface scope.
- Single-surface journey is allowed only with verified exclusion evidence.
- Groups are proposals only and do not declare readiness.