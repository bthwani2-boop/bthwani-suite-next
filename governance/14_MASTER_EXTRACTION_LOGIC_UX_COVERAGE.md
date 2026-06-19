# 14 — Master Extraction, Logic, and UX Coverage

Status: CANONICAL
Stage: PHASE_10_11_MASTER_EXTRACTION_LOGIC_UX_COVERAGE

## Purpose

Define the measurable pre-slice inventory for extracting useful DSH/WLT knowledge
from the donor repository without treating donor source, design, or runtime claims
as target-repository truth.

This phase creates a corrected inventory and exposes the next blocking
dependency. It does not make DSH-001 plan-ready, runtime-ready, production-ready,
verified, or closed.

## Scope

The active scope is:

- DSH operational commerce and delivery capabilities.
- WLT capabilities directly required by DSH.
- app-client, app-partner, app-captain, app-field, and control-panel.
- The seven canonical control-panel sections.
- Screen names, routes, required states, permissions, negative cases, performance,
  observability, evidence, and visual-reference requirements.
- Donor analysis from `C:\bthwani-suite` on branch `realtest`, read-only.

## What this phase does

- Inventories donor artifacts and records an extraction decision for each entry.
- Defines DSH/WLT operational rules and financial ownership.
- Defines control-panel pages, mobile journeys, and screen-state obligations.
- Defines target paths and slice ownership before implementation.
- Identifies blocked, rejected, reserved, and inventory-only work.
- Creates evidence for the contract-planning gate.

## What this phase does not do

- No product backend, database migration, seed, or provider integration.
- No product OpenAPI endpoint or generated client.
- No frontend/shared runtime implementation.
- No screen, route, app mount, or Docker product profile.
- No donor folder copy and no donor source-code adoption by assumption.
- No runtime, visual, production, verified, closed, or 100-percent completion claim.

## CSV files

The canonical machine-readable coverage files are:

1. `machine-readable/extraction_matrix.csv`
2. `machine-readable/dsh_wlt_logic_coverage_matrix.csv`
3. `machine-readable/control_panel_coverage_matrix.csv`
4. `machine-readable/mobile_ux_journey_matrix.csv`
5. `machine-readable/screen_state_coverage_matrix.csv`
6. `machine-readable/donor_control_panel_alias_matrix.csv`

CSV identifiers must be unique. Required fields must be non-empty. Slice,
capability, screen, journey, and control-panel references must remain consistent
across matrices.

## Decision meanings

- `ADOPT_AS_IS`: structurally safe non-runtime artifact with direct target fit.
- `ADAPT_NORMALIZE`: useful source requiring target ownership and contract normalization.
- `REWRITE_FROM_SPEC`: behavior must be rebuilt from target contracts and rules.
- `REFERENCE_ONLY`: donor behavior or visuals may inform a new implementation.
- `REJECT`: artifact or pattern must not enter target runtime.

Donor screens are normally `REFERENCE_ONLY`. Donor backend, contracts, and shared
logic are never target truth without slice-level review and target evidence.

## Status meanings

- `INVENTORY_ONLY`: recorded but not approved for implementation.
- `READY_FOR_SLICE`: reserved for a future row whose complete entry gate has passed.
- `BLOCKED_NEEDS_EVIDENCE`: a required source or decision lacks evidence.
- `BLOCKED_NEEDS_WLT`: WLT ownership or contract is unresolved.
- `BLOCKED_NEEDS_API_CONTRACT`: an API contract must be defined first.
- `BLOCKED_NEEDS_RUNTIME_EVIDENCE`: implementation exists but runtime proof is absent.
- `RESERVED_INVENTORY`: intentionally inactive capability or section.
- `REJECTED`: prohibited source or pattern.

The repaired Phase 10/11 matrices must not assign `READY_FOR_SLICE` to DSH-001
while Store Discovery is absent from the service-owned OpenAPI. No row receives
a completion state until its slice is implemented and backed by contract, test,
runtime, and visual evidence where applicable.

## Immediate rejection rules

Reject preview, demo, mock, fixture, or memory-backed runtime truth; fake actor
identities; screen-shaped APIs; financial mutation outside WLT; local design
systems; deep ui-kit imports; direct Tamagui outside ui-kit; wildcard production
CORS; old documentation used as current truth; unsupported closure claims;
direct fetch inside screens; raw visual tokens outside ui-kit; and business logic
inside app shells.

## DSH/WLT logic completeness rule

Every operation must declare:

- Actor, surface, service owner, capability, and slice.
- Domain invariants and state transitions.
- API, database, authentication, and object-ownership expectations.
- Validation, errors, negative cases, conflict, concurrency, timeout, and retry behavior.
- Idempotency for writes, callbacks, and financially relevant requests.
- Pagination, indexed filters, bounded limits, and stable ordering for lists.
- Structured logs, traces, metrics, correlation, and audit evidence.
- Required tests and runtime evidence.

Sensitive APIs must account for object-level and function-level authorization,
resource consumption, automated abuse of business flows, inventory drift, and
unsafe third-party API consumption. Provider callbacks require signature
verification, replay protection, duplicate handling, event-order tolerance, and
reconciliation of ambiguous outcomes.

## WLT financial ownership rule

DSH owns operational commerce and delivery truth. DSH may retain opaque WLT
references and read-only statuses required to coordinate an order.

WLT exclusively owns payment sessions, payment confirmation, provider callback
truth, refunds, settlements, payouts, commission, COD financial truth, ledger,
reconciliation, finance reports, and financial audit.

DSH must not calculate, confirm, execute, reconcile, or mutate financial truth.
Cross-service bridges carry requests, identifiers, statuses, and correlation
metadata only.

## Control panel seven-section rule

The only canonical main sections are:

1. `partners`
2. `operations`
3. `wallet-finance`
4. `support`
5. `marketing`
6. `catalog`
7. `platform`

`wallet-finance` is WLT-owned. DSH participation is limited to operational
references and read-only status consumption.

## Donor section alias rule

- `partners` maps to `partners`.
- `operations` maps to `operations`.
- `finance` maps to `wallet-finance`.
- `support` maps to `support`.
- `marketing` maps to `marketing`.
- `catalogs` maps to `catalog`.
- `platform` maps to `platform`.
- `dashboard` becomes shell overview only.
- `community-services` remains reserved inventory.
- `administration` becomes a platform subpage.
- `hr` becomes a read-only platform subpage or reserved inventory.

No alias creates an eighth main section.

## Mobile UX coverage rule

All four mobile surfaces require end-to-end journeys:

- app-client: discovery through checkout, order, refund-status, and support.
- app-partner: readiness, catalog, order execution, support, and finance-status reads.
- app-captain: assignment, pickup, drop-off, issue handling, support, and finance-status reads.
- app-field: visits, onboarding, evidence, readiness submission, blocking, and support.

Every journey declares entry, screen sequence, target path, contracts,
permissions, primary and recovery actions, offline/retry behavior, and evidence.

## Screen state rule

Every screen declares loading, empty, error, permission, and success states.
Offline, retry, and blocked states are mandatory whenever a network dependency,
write action, assignment, or business rule can prevent completion.

Screens must not display fabricated live data while offline or blocked.

## Design donor rule

Donor design is visual reference only:

1. Capture the useful visual pattern during the implementing slice.
2. Map it to public `@bthwani/ui-kit` exports.
3. Rebuild in the canonical target path.
4. Verify RTL, small-screen overflow, loading, empty, error, permission, blocked,
   and success states.
5. Record runtime and screenshot evidence.

Copying a donor screen as target source is prohibited.

## Slice-start rule

DSH-001 must not start until:

- All six matrices pass structural and semantic checks.
- `services/dsh/contracts/dsh.openapi.yaml` defines and passes review for
  `GET /dsh/stores` and `GET /dsh/stores/{storeId}`.
- Every mandatory slice, operation, page, journey, and screen state is present.
- Financial ownership, idempotency, authorization, list performance, and screen
  state checks report zero gaps.
- Source paths are evidenced or explicitly blocked.
- The foundation gate and diff check pass.

The current repaired result is:

```text
REPAIR_COMPLETE_BLOCKED_NEEDS_API_CONTRACT
```

DSH-001 rows remain `BLOCKED_NEEDS_API_CONTRACT`. Later rows remain
`INVENTORY_ONLY`, `BLOCKED_NEEDS_WLT`, or `RESERVED_INVENTORY`.

## Acceptance condition

Accepted only when the required matrices exist and pass the Phase 10/11 checks,
the seven control-panel sections and four mobile apps are covered, DSH contains
no financial-truth ownership, WLT writes and callbacks require idempotency,
object operations declare authorization, list operations declare bounded
performance rules, screen rows declare required states, forbidden claims are
absent, `contracts/master.openapi.yaml` remains an index with empty paths,
`services/dsh/contracts/dsh.openapi.yaml` remains unchanged in this repair, and
the evidence pack records `REPAIR_COMPLETE_BLOCKED_NEEDS_API_CONTRACT` with a
passing foundation gate.
