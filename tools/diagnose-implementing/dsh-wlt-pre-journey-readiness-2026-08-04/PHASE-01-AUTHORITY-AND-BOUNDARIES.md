# PHASE 01: Authority, Trust, and Boundaries

## Scope
Identity, Sessions, Roles, Permissions, Partner/Store Scopes, Platform Context, Central Contracts, and Architectural Dependencies.

## Inputs
- `governance/product/platform-model.yaml`
- OpenAPI definitions (`services/dsh/contracts`, `services/wlt/contracts`)

## Outputs
- Purged and consolidated identity/auth logic.
- Strict DSH to WLT isolation (No direct WLT surface access).
- Centralized `partner_id` and `store_id` resolution.

## Dependencies
- None.

## Tasks
1. **Diagnose Identity & Roles:** Scan for fragmented session management and parallel authorization checks.
2. **Trace DSH-WLT Boundaries:** Identify any direct surface-to-WLT calls. Reroute through DSH facades.
3. **Contract Consolidation:** Ensure OpenAPI contracts are the single source of truth for DSH and WLT boundaries.
4. **Remove Duplicates:** Delete parallel role validators or outdated auth fallbacks.

## Acceptance Criteria
- Zero direct Surface->WLT API calls.
- Single unified middleware/auth guard for Partner/Store scope.
- Contract-first generation confirmed.

## Independent Closure Checks
- Static analysis for direct WLT endpoints in frontend packages returns 0.
- Unit and Integration auth tests PASS.
