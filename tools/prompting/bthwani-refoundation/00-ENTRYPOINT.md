# BThwani Canonical Refoundation Target Package — Entrypoint

PACKAGE_REVISION: 1
PACKAGE_CLASS: TEMPORARY_CANONICAL_TARGET_SPECIALIZATION
TARGET_REPOSITORY: bthwani2-boop/bthwani-suite-next
TARGET_BRANCH: h
COMPLETION_TARGET: LEVEL_4_FIXED_POINT
TEMPORARY_ARTIFACT: YES
PROGRESS_LEDGER: FORBIDDEN
SELF_DELETE_AFTER_VERIFIED_CLOSURE: REQUIRED

## 0. Authority

This package is not an execution constitution, status ledger, architecture archive, or replacement orchestrator.

The sole execution and closure constitution remains:

`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`

and the semantic owners it requires.

```text
ORCHESTRATOR_00..05 + APPLICABLE focus/*
> THIS TEMPORARY TARGET PACKAGE
> INHERITED REPOSITORY SHAPE
```

If any text here conflicts with a current orchestrator owner, the orchestrator owner wins. This package may specialize the canonical target and target-specific closure requirements only. It must never weaken demolition, migration, cutover, deletion, recovery, verification, or fixed-point law.

No file in this package may become a second source of live campaign state.

Forbidden here:

```text
CHECKBOX_PROGRESS
MUTABLE_STATUS_FIELDS
CURRENT_HEAD_AS_DURABLE_TRUTH
COMPLETED_COMMIT_LEDGER
SESSION_STATE
ACTIVE_UNIT_LEDGER
DEFERRED_GARBAGE_QUEUE
HISTORICAL_ARCHIVE
```

Live `h` and fresh evidence are the only present-state authority.

## 1. Mission

Define the temporary repository-wide canonical target needed to refound the inherited topology into explicit ownership:

```text
DEPLOYABLE HOST        → apps/
BOUNDED CONTEXT/SERVICE→ services/
REUSABLE TECHNICAL CODE→ packages/
CROSS-SERVICE WIRE LAW → contracts/
ENVIRONMENT/DEPLOYMENT → infra/
EXECUTION/DEV TOOLING  → tools/
```

Primary structural outcomes:

```text
REMOVE core/ AS A TOP-LEVEL OWNERSHIP CLASS
REMOVE shared/ AS A TOP-LEVEL OWNERSHIP CLASS
REMOVE apps/*/runtime WHEN IT IS ONLY A PASS-THROUGH PARENT
DO NOT CREATE A GENERIC PROVIDERS GOD SERVICE
REFOUND UI-KIT AS A REAL DESIGN SYSTEM
REFOUND WORKFORCE AROUND PERSON + ENGAGEMENT + OPERATIONAL ROLE
KEEP SERVICE CONTRACTS SOVEREIGN
KEEP ROOT contracts/ NON-BUSINESS AND NON-RUNTIME-AUTHORITATIVE
KEEP infra/ LIMITED TO ENVIRONMENT/DEPLOYMENT COMPOSITION
```

Required truth is preserved even when its inherited container is deleted.

## 2. Mandatory load order

For execution of this refoundation:

1. Load the latest live `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`.
2. Load `01` through `05` and every materially applicable `focus/*` owner it requires.
3. Re-pin exact live `h`; reconstruct recovery frontier before selecting new work.
4. Load this file.
5. Load `01-CANONICAL-REPOSITORY-TOPOLOGY.md`.
6. Load `02-CROSS-BOUNDARY-DEPENDENCY-LAWS.md`.
7. Load every materially affected file under `targets/`.
8. Load both files under `closure/` before mutation/closure decisions.

Do not select a new target from this package when the orchestrator recovery law proves an `ACTIVE_OPEN_UNIT` already exists.

## 3. Target modules

```text
targets/apps-and-composition.md
  Deployable app flattening, host ownership, navigation/composition, Account/Home/Login/Search/Settings/Notification host rules.

targets/dsh-wlt.md
  DSH operational ownership, WLT financial independence, frontend/backend/contracts/database/capability topology.

targets/identity-workforce.md
  Identity authority and Workforce refoundation around orthogonal engagement and operational-role axes.

targets/providers-and-integrations.md
  External integration control plane, domain-owned ports/adapters, secrets, sandbox/simulation, retry/fallback/reconciliation.

targets/design-system-and-packages.md
  shared/ demolition, design-system refoundation, package admission, data-runtime/resilience/control-panel disposition.

targets/contracts-and-protocols.md
  Sovereign service contracts, cross-service protocol primitives, generated API catalog, contract lineage.

targets/infra-and-runtime.md
  Local/deployment infrastructure, compose, secrets binding, test simulators, environment ownership, observability.
```

## 4. Exact-state and recovery law

This package contains target decisions, not a snapshot of current state.

At every session/re-entry:

```text
PIN_EXACT_LIVE_h
→ INSPECT_MATERIAL_HISTORY_AND_ACTUAL_DIFFS
→ RECONSTRUCT_CURRENT_STAGE
→ IDENTIFY_LAST_PROVEN_CLOSED_UNIT
→ IDENTIFY_ACTIVE_OPEN_UNIT
→ VERIFY_WINNER/LOSER/MIGRATION/CUTOVER/DELETION_STATE
→ INVALIDATE_STALE_EVIDENCE
→ RECHECK_NEGATIVE_SPACE
→ FIND_RECOVERY_FRONTIER
→ DERIVE_NEXT_REQUIRED_ACTION
```

If `h` moves during a write sequence:

```text
STOP_WRITING_TO_STALE_HEAD
→ RE_PIN
→ COMPARE_MOVEMENT
→ RECONCILE_AFFECTED_CONE
→ CONTINUE_FROM_CURRENT_TRUTH
```

## 5. Package lifetime

This package exists only to specialize the active refoundation campaign.

After repository-wide Level-4 fixed point:

```text
VERIFY_NO_SCRIPT/CI/BUILD/RUNTIME/GENERATOR/TEST/PROMPT DEPENDS_ON_THIS_PACKAGE
→ DELETE tools/prompting/bthwani-refoundation/
→ RE_PIN_LIVE_h
→ VERIFY_PACKAGE_ABSENT
→ VERIFY_ZERO_REFERENCES_TO_OLD_PACKAGE_PATHS
→ FINAL_FIXED_POINT_CONFIRMATION
```

Git history is the archive. The canonical live repository must not retain this temporary package.