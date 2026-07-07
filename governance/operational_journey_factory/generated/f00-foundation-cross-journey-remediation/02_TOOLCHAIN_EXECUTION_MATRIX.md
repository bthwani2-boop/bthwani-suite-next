# 02 Toolchain Execution Matrix

status: `EVALUATED`

This matrix documents the execution outcomes of all static and runtime validation tools.

| Tool / Guard Script | Scope | Command | Outcome / Exit Code | Classification |
|---|---|---|---|---|
| `openapi:generate` | API Contract | `pnpm run openapi:generate` | PASS (0) | `FIX_REQUIRED` (Clean run) |
| `diagnostics:operational:toolchain` | Tool Catalog | `pnpm run diagnostics:operational:toolchain` | PASS (0) | `FIX_REQUIRED` |
| `diagnostics:operational:surfaces` | Surface Catalog | `pnpm run diagnostics:operational:surfaces` | PASS (0) | `FIX_REQUIRED` |
| `diagnostics:operational:inventory` | Journey Catalog | `pnpm run diagnostics:operational:inventory` | PASS (0) | `FIX_REQUIRED` |
| `diagnostics:operational:gaps` | Gaps Ledger | `pnpm run diagnostics:operational:gaps` | PASS (0) | `FIX_REQUIRED` |
| `graphify` | AST Dependency | `pnpm run graphify` | PASS (0) | `FIX_REQUIRED` |
| `graphify:callflow` | Call Graph | `pnpm run graphify:callflow` | PASS (0) | `FIX_REQUIRED` |
| `knip` | Dead Code | `pnpm exec knip --reporter json > ...` | PASS (1 - reported unused items) | `FIX_REQUIRED` |
| `madge` | Circular Dependencies | `pnpm exec madge services/dsh --circular` | PASS (0 - no circular) | `FIX_REQUIRED` |
| `depcruise` | Import Layering | `pnpm exec depcruise services/dsh --no-config ...` | PASS (0) | `FIX_REQUIRED` |
| `jscpd` | Duplication | `pnpm exec jscpd . --reporters json ...` | PASS (0) | `FIX_REQUIRED` |
| `guard:operational-journey-factory` | Governance Templates | `pnpm run guard:operational-journey-factory` | PASS (0) | `FIX_REQUIRED` |
| `guard:frontend-feature-binding` | Frontend Capabilities | `pnpm run guard:frontend-feature-binding` | PASS (0) | `FIX_REQUIRED` |
| `guard:runtime-config` | Environment Vars | `pnpm run guard:runtime-config` | PASS (0) | `FIX_REQUIRED` |
| `guard:wlt-financial-boundary` | Financial Boundary | `pnpm run guard:wlt-financial-boundary` | PASS (0) | `FIX_REQUIRED` |
| `guard:fullstack-boundary` | Service Isolation | `pnpm run guard:fullstack-boundary` | PASS (0) | `FIX_REQUIRED` |
| `guard:backend-api-binding` | API Client | `pnpm run guard:backend-api-binding` | PASS (0) | `FIX_REQUIRED` |
| `guard:api-binding` | API Contract | `pnpm run guard:api-binding` | PASS (0) | `FIX_REQUIRED` |
| `guard:service-manifest-drift` | Service Registry | `pnpm run guard:service-manifest-drift` | PASS (0) | `FIX_REQUIRED` |
| `guard:no-broken-imports` | AST Imports | `pnpm run guard:no-broken-imports` | PASS (0) | `FIX_REQUIRED` |
| `guard:dependency-graph` | Circular Warnings | `pnpm run guard:dependency-graph` | PASS (0 - warning only) | `FIX_REQUIRED` |
| `guard:ui-kit-boundary` | Raw Style Check | `pnpm run guard:ui-kit-boundary` | PASS (0) | `FIX_REQUIRED` |
| `guard:icon-contract` | Accessibility Labels | `pnpm run guard:icon-contract` | PASS (0) | `FIX_REQUIRED` |
| `guard:design-tokens` | Layout Warning Check | `pnpm run guard:design-tokens` | PASS (0) | `FIX_REQUIRED` |
| `typecheck` | TypeScript Safety | `pnpm run typecheck` | PASS (0) | `FIX_REQUIRED` |
| `test` | Unit Tests | `pnpm run test` | PASS (0 - 217 tests pass) | `FIX_REQUIRED` |
| `guard:workflow-lint` | Actions Lint | `pnpm run guard:workflow-lint` | PASS (0) | `FIX_REQUIRED` |
| `guard:workflow-security` | Action Audits | `pnpm run guard:workflow-security` | FAIL (1 - HTTP 401 Unauthorized API error) | `BLOCKED_NEEDS_ENV` |
| `guard:secrets` | Secrets scan | `pnpm run guard:secrets` | PASS (0 - no leaks) | `FIX_REQUIRED` |
| `runtime:status` | Docker Status | `pnpm run runtime:status` | PASS (0 - all containers running) | `FIX_REQUIRED` |
| `runtime:smoke` | DSH & Media Smoke | `pnpm run runtime:smoke` | PASS (0 - healthy) | `FIX_REQUIRED` |
| `runtime:wlt:status` | WLT Docker Status | `pnpm run runtime:wlt:status` | PASS (0 - wlt container running) | `FIX_REQUIRED` |
| `runtime:wlt:smoke` | WLT API Smoke | `pnpm run runtime:wlt:smoke` | PASS (0 - healthy) | `FIX_REQUIRED` |
| `runtime:identity:status`| Identity Docker Status| `pnpm run runtime:identity:status` | PASS (0 - identity running) | `FIX_REQUIRED` |
| `runtime:identity:smoke` | Identity API Smoke | `pnpm run runtime:identity:smoke` | PASS (0 - healthy) | `FIX_REQUIRED` |

## Tool Run Verification

- [x] All required toolchain check outcomes have been captured.
- [x] Network/API authentication failures are correctly isolated and classified as environment-blocked (`BLOCKED_NEEDS_ENV`).
- [x] Runtime validation confirms Docker compose stack is active, healthy, and responsive.
