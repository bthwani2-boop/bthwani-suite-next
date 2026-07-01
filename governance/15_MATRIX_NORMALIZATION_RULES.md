# 15 — Matrix Normalization Rules

Status: CANONICAL
Stage: REPAIR_PHASE_10_11_SURFACE_OWNERSHIP_AND_MATRIX_NORMALIZATION

## Purpose

Keep Phase 10/11 matrices consistent enough to act as a strict entry gate for
future journeys without creating code, contracts, database objects, or runtime.

## Allowed service owners

- `dsh`
- `wlt`
- `core`
- `shared-ui-kit`
- `shared-app-shell`

`dsh-wlt`, app names, control-panel, and platform are not service owners.

## Allowed surfaces

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`
- `shared`
- `system`
- `all-surfaces`

## Canonical control-panel sections

The seven main sections are `partners`, `operations`, `wallet-finance`,
`support`, `marketing`, `catalog`, and `platform`. `shell-overview` is a shell
landing context, not an eighth main section.

## Canonical journey map

- Store Discovery Journey
- Catalog Management Journey
- Cart & Serviceability Journey
- Checkout & WLT Handoff Journey
- Order Fulfillment Journey
- Partner Orders and Catalog Actions Journey
- Captain Tasks Journey
- Field Onboarding Journey
- Address-Zone Serviceability Journey
- Order Cancellation and Refund Bridge Journey
- Operations Room Journey
- Media References Journey
- Notification Readiness Journey
- Support Journey
- Marketing Journey
- Payment Sessions capability
- Refund Status capability
- Settlement Status Reads capability
- Commission and COD References capability
- Ledger, Audit, and Reconciliation References capability
- Integration capability flows
- Platform Readiness capability

## DSH/WLT ownership rule

DSH owns operational commerce and delivery state. WLT owns monetary state,
provider callback truth, refunds, settlement, payout, commission, COD financial
truth, ledger, reconciliation, and finance audit.

Cross-service rows retain a real service owner and use
`integration_scope=dsh-wlt`. DSH may consume opaque references and statuses but
must not mutate financial truth.

## Platform ownership rule

Platform pages and platform-readiness rows belong to `core`, use
`journey_id=PLATFORM-001`, and target `apps/control-panel/sections/platform`.
Platform must not be placed below `services/dsh`.

## Frontend shared surface rule

Every `services/<service>/frontend/shared/...` row uses `surface=shared` and a
non-empty `consumer_surfaces` value. App and control-panel roots remain consumers,
not owners of shared logic.

## No dsh-wlt service owner rule

`dsh-wlt` is permitted only as an integration scope or integration journey ID.
Every target below `services/dsh` or `services/wlt` has the corresponding real
service owner.

## No SERVICE_BLUEPRINT for real services rule

Matrices must not target `services/dsh/SERVICE_BLUEPRINT.md` or
`services/wlt/SERVICE_BLUEPRINT.md`. Service manifests or the shared template
governance own those planning references. Only
`services/_template/SERVICE_BLUEPRINT.md` may be a template target.

## No apps/shared/runtime rule

App mounts target `apps/app-client`, `apps/app-partner`, `apps/app-captain`,
`apps/app-field`, or `apps/control-panel`. Shared shell ownership targets
`shared/app-shell`.

## Mobile capability ownership rule

- Client notifications use Platform Policies.
- Field intake and assignment conflicts use Field Verification.
- Captain payment-reference reads remain DSH-owned captain-task UI with a
  DSH-WLT integration dependency.
- Partner catalog management is distinct from client storefront browsing.
- Mobile support entry uses Administration; support queues remain control-panel behavior.

## Acceptance gates

- Extraction schema v2 exists and row count does not decrease below 500.
- Platform-under-DSH, `dsh-wlt` service owners, forbidden blueprint targets,
  `apps/shared/runtime`, shared-surface mismatches, mobile ownership mismatches,
  invalid page types, donor misclassification, and harmful duplicates are zero.
- operations-room contains operations only.
- Payment sessions map to WLT Payment Sessions.
- Store Discovery includes all required layers but remains non-ready while contract or
  domain requirements are blocked.
- `git diff --check` and the foundation gate pass.

## Final logic and metadata consistency rules

The following rules were added during REPAIR_PHASE_10_11_FINAL_LOGIC_AND_METADATA_CONSISTENCY.
All must pass before any journey execution begins.

### Core identity must not target DSH paths

Any row with `service = core` must not have `target_path` starting with
`services/dsh/`. Core identity artifacts use `core/identity/reference/` paths.
Violations must be corrected to `core-identity` with `REFERENCE_ONLY` decision.

### SPEC journey must match journey_id

Any `source_path` starting with `SPEC:` must use the format `SPEC:<SLICE_ID>:<layer>`.
The captured journey segment must equal `journey_id`. Mismatches are blocking.

Correct format examples:

- `SPEC:Administration:governance` with `journey_id=support`
- `SPEC:PLATFORM-001:evidence` with `journey_id=PLATFORM-001`
- `SPEC:RESERVED:reserved-service-knz` with `journey_id=RESERVED`
- `SPEC:FOUNDATION:services/_template-required` with `journey_id=FOUNDATION`

### operations-room / support split

`operations-support` is not a valid executable capability.

- `section=operations` or `journey_id=operations-room` → `capability=operations-room`
- `section=support` or `journey_id=support` → `capability=support-queue` or `capability=support-entry`

No row with `capability=operations-support` and `status != RESERVED_INVENTORY` may remain.

### WLT direct logic coverage rule

Refund Status capability must have at least 5 direct WLT logic rows with:

- `service=wlt`, `capability=refund-status`, `journey_id=refund-status`
- Coverage: create, get, idempotency, callback, audit, DSH read reference

Settlement Status Reads capability must have at least 4 direct WLT logic rows with:

- `service=wlt`, `capability=settlement-status-read`, `journey_id=settlement-status-read`
- Coverage: list, get, read model, DSH read reference, audit

Bridge rows (Refund and Settlement Integration flows) do not substitute for WLT's own logic rows.

### Support-entry logic rule

Support Journey must have at least 4 direct support-entry logic rows with:

- `service=dsh`, `capability=support-entry`, `journey_id=support`
- One row per actor: client, partner, captain, field

### Marketing Journey rule

Any row with `capability=marketing` and `journey_id=marketing` must not reference
`operations-room` in `api_contract`. Marketing contracts belong to marketing.

Correct: `NEW_REQUIRED: DSH marketing review contract in marketing`

### settlement-status-read canonical naming

`settlement-read-model` is not a valid `capability` value. Use `settlement-status-read`.

If the read model needs to be referenced, use:

- `artifact_type=read-model`
- or `db_objects=settlement_read_model`

The `target_path` must also use `settlement-status-read` not `settlement-read-model`.

### commission-reference and cod-reference split

`commission-cod-reference` is not a valid executable capability. Split as follows:

- Content focused on commission → `capability=commission-reference`, `journey_id=commission-cod`
- Content focused on COD/cash-on-delivery → `capability=cod-reference`, `journey_id=commission-cod`
- Aggregate rows that cover both → `capability=wallet-finance-summary`, `journey_id=commission-cod or WLT Ledger`

### Control-panel section path strategy

Control Panel `target_path` uses the **section folder**, not the capability folder.

Pattern: `services/<service>/frontend/control-panel/<section>/<ScreenName>Screen.tsx`

Section folder mapping:

- `section=partners` → `/control-panel/partners/`
- `section=operations` → `/control-panel/operations/`
- `section=support` → `/control-panel/support/`
- `section=marketing` → `/control-panel/marketing/`
- `section=catalog` → `/control-panel/catalog/`
- `section=wallet-finance` → `/control-panel/wallet-finance/`
- `section=platform` → `apps/control-panel/sections/platform/`

Capability sub-folders (e.g. `/wallet-finance/refund-status/`) are allowed inside
the section folder. Using the capability folder as the top-level folder is forbidden.

### screen_state section audit rule

`screen_state_coverage_matrix.csv` must include a `section` column (after `surface`).

- Every `surface=control-panel` row must declare a valid `section` (not `none` or empty).

- Non-control-panel rows use `section=none`.

### ADOPT_AS_IS evidence rule

Any row with `decision=ADOPT_AS_IS` must have `evidence` containing one of:

- `"exists in target and verified"`
- `"verified in target"`
- `"gate verified"`

If no explicit target verification exists, change decision to `ADAPT_NORMALIZE` or
`REFERENCE_ONLY` as appropriate.

### Store Discovery readiness remains blocked until contract/domain readiness

`Store Discovery` must not have `status=READY_FOR_JOURNEY` until a separate step explicitly
approves the following contracts:

- `GET /dsh/stores`
- `GET /dsh/stores/{storeId}`
- Store domain shape
- Store DB schema
- Store auth and serviceability rules

No row in any matrix may reach `READY_FOR_JOURNEY` during the final consistency repair.
The target gate after this repair is:

```text
PHASE_10_11_MATRICES_CONSISTENT_NOT_JOURNEY_READY
```

The next step after this gate is:

```text
Store Discovery_CONTRACT_AND_DOMAIN_READINESS
```

## Journey Execution Master Matrix

Canonical file:

```text
machine-readable/journey_execution_master_matrix.csv
```

Purpose: Unified pre-journey execution map generated from all six source matrices
(extraction, logic coverage, control-panel, mobile UX, screen state, and donor
alias). It is the single gate reference for journey readiness verification.

Rules:

- Source matrices remain the detailed evidence layer; the master matrix is the
  execution gate.
- Row count must be ≥ 900.
- All 48 required columns must be present.
- `status` must not include `READY_FOR_JOURNEY` or `VERIFIED` before journey
  readiness phase.
- `service` must be one of `dsh`, `wlt`, `core`, `shared-ui-kit`,
  `shared-app-shell`, or `reserved`. `dsh-wlt` is not a valid service owner.
- Control-panel rows must declare a non-empty `section` using the canonical
  seven sections.
- WLT financial ownership remains absolute; DSH rows that reference monetary
  state use `wlt_boundary` or `wlt_dependency`.
- Reserved services remain `RESERVED_INVENTORY`; no reserved row may advance to
  an executable status before scope approval.
- `duplicate_key` must be unique across all rows. Conflicts are resolved by
  appending `|frag:<fragment_id>` or `|id:<master_id>` as disambiguators.
- `blocker_code` is derived from `status`; every blocked row must carry a
  specific blocker code rather than `NONE`.
- `acceptance_gate` and `verification_command` are required for all rows with
  a non-blocked status.

## Acceptance condition

Accepted only when every normalization check reports zero violations and the
final result remains conservative:

```text
PHASE_10_11_MATRICES_CONSISTENT_NOT_JOURNEY_READY
```

---

## V2 → V3 Normalization Additions (MASTER_MATRIX_V3_FINAL_CLOSURE)

### V3 file canonical path

```text
machine-readable/journey_execution_master_matrix_v3.csv
```

### V3 vs V2 differences

| Aspect | V2 | V3 |
| --- | --- | --- |
| Row count | 1072 | 1180 |
| Column count | 67 (repaired) | 66 (canonical V3 header) |
| Header definition | flexible | exact — no deviations allowed |
| Canonical policy rows | none | DSH states, WLT states, dispatch, pricing, COD, notifications, endpoints, boundary, ext-deps, donor aliases |
| Status | INVENTORY\_ONLY/BLOCKED | same — READY\_FOR\_SLICE and VERIFIED remain forbidden |

### V3 canonical column order

Exact header required — stored in guard-journey-operating-model.mjs as EXACT_HEADER constant.

### Machine-readable source rule

All canonical CSVs exist only in `C:\bthwani-suite-next\machine-readable`.
Donor paths `C:\bthwani-suite\wlt`, `C:\bthwani-suite\dsh`, `C:\bthwani-suite\tools`, `C:\bthwani-suite\tools\guards` are reference-only.
Never read `C:\bthwani-suite\machine-readable`, `C:\bthwani-suite\services`, or `C:\bthwani-suite\packages` — they do not exist in the donor.

### Provider abstraction rule

No external provider may be named in any matrix cell. Use abstract contracts:

- `abstract-maps-provider`, `abstract-sms-provider`, `abstract-NotificationProvider`
- `abstract-payment-gateway`, `abstract-storage-provider`, `abstract-email-provider`
- `abstract-geolocation-provider`, `abstract-analytics-provider`

Every row with `external_dependencies` must carry `provider_decision = TBD_CONFIG_REQUIRED:...` or stronger.

### Store submission gate

Mobile surface rows: `build_target = expo-dev-client; store-submission reserved until PRE_STORE_READINESS_GATE`
No row may advance to store submission before `PRE_STORE_READINESS_GATE` is explicitly declared.

### Service manifest policy

Real services use `service.manifest.ts` as active machine-readable contract.
`SERVICE_BLUEPRINT.md` is allowed only in `services/_template` as template.
Existing real-service `SERVICE_BLUEPRINT.md` is legacy reference until migrated.
No new real-service `SERVICE_BLUEPRINT.md` may be created.

### Guard commands

```bash
node tools/guards/guard-journey-operating-model.mjs
node tools/guards/guard-journey-operating-model.mjs
```

Both must exit 0 before any journey execution begins.

### Evidence requirements for V3 closure

- `tools/registry/runs/MASTER-MATRIX-V2-V3-FINAL-CLOSURE-*/` must exist with all required files
- `matrix-v2-audit-before.json` and `matrix-v2-audit-after.json` must be present
- `matrix-v3-audit.json` must be present
- `donor-wlt-dsh-inventory.json` must be present
- `donor-guard-inventory.json` must be present
