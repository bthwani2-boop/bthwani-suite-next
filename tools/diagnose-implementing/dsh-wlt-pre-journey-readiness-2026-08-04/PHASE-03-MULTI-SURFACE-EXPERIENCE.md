# PHASE 03: Multi-Surface Experience

## Scope
Frontend applications (app-client, app-partner, app-captain, app-field, control-panel), Shared Brains, Routing, UI Controls, Runtime UX.

## Inputs
- Re-generated API clients from Phase 01 & 02.

## Outputs
- Cleaned and consolidated React/UI components.
- Eliminated dead screens and orphaned routes.
- Consistent error and loading states (Offline, Loading, Blocked).

## Dependencies
- `PHASE-02-DSH-WLT-SERVICES-AND-INTEGRATIONS`

## Tasks
1. **Diagnose Shared Brains:** Identify redundant API wrappers, duplicate view models, and unconsumed adapters.
2. **Purge Dead Screens:** Remove unreachable routes and obsolete UI components.
3. **Control Validation:** Ensure every button/action correctly connects to the canonical backend handler.
4. **UX States Standardization:** Apply standard loading, error, empty, offline, and conflict states across all surfaces.

## Acceptance Criteria
- Zero obsolete UI components or dead routes.
- Frontend consumes only auto-generated clients.
- All actions accurately reflect DSH (operational) or WLT (financial) via DSH.

## Independent Closure Checks
- Linting and Typechecking PASS.
- Visual/Component tests PASS.
- Runtime Readback tests across surfaces PASS.
