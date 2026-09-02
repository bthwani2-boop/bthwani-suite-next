# 04 — ELIMINATION, DELETION, LINE/FILE/DIRECTORY/SCREEN FINISHING

## Purpose

Make cleanup destructive where safe, proportional to risk, and inseparable from structural and end-to-end parity closure. This file applies to every Closure Unit and final qualification.

## Deletion risk classes

Use the lightest proof that is still safe.

### LOW-RISK / NOISE

Examples: dead line/symbol, unused helper/export, obsolete file, empty/useless directory, dead pass-through wrapper, stale script, unused workflow, unused dependency, redundant fixture/mock/snapshot, temporary/copied artifact, orphan screen/route/binding/API with no required consumer or authority.

Required proof:

```text
NO_CANONICAL_AUTHORITY
NO_MUTABLE_STATE
NO_REQUIRED_RUNTIME_ROUTE
NO_REQUIRED_EXTERNAL_CONTRACT
NO_REQUIRED_IMPORT/CALLER/CONSUMER
NO_REQUIRED_PRODUCT_CAPABILITY/JOURNEY
NO_REQUIRED_MIGRATION_OR_UPGRADE_ROLE
NO_SECURITY_OR_COMPLIANCE_ROLE
```

For backend/API/data artifacts, consumer proof must cover all apps/surfaces, control panel, mobile clients, integrations, events/webhooks, runtime calls, scripts/tools, operations, and supported external consumers.

Then immediately:

`DELETE_NOW → SEARCH REFERENCES AGAIN → AFFECTED VERIFY`.

No migration plan, compatibility layer, archival folder, or lengthy ceremony is required.

### STATEFUL / CONTRACTUAL / RUNTIME / SECURITY / MIGRATION-SENSITIVE

Use the fuller safety proof appropriate to the risk:

`consumer inventory | data migration/backfill | contract cutover | runtime route transition | generated regeneration | security/integrity proof | supported upgrade path | persisted readback`.

Then delete the losing structure as soon as cutover is proven.

## Every affected artifact gets a realized disposition

Every material artifact in the affected cone must end with one actual state matching the ledger:

`KEEP_PROVEN | HARDEN | REFACTOR | REHOME | RENAME | MERGE | SPLIT | REWRITE | REGENERATE | MIGRATE | DELETE | DELETE_NOW | BOUNDED_RETIREMENT`.

`LEDGER_SAYS_DELETE + ARTIFACT_STILL_PRESENT=ROOT_OPEN`.

## Directory/package death test

For every affected directory/package:

```text
UNIQUE_COHESIVE_RESPONSIBILITY? YES → KEEP/HARDEN
NO RESPONSIBILITY → DELETE
DUPLICATE RESPONSIBILITY → MIGRATE TO WINNER → DELETE LOSER
MIXED RESPONSIBILITIES → SPLIT BY TRUE OWNER
WRONG OWNER → REHOME
PASS-THROUGH ONLY → REMOVE
HISTORICAL COMPAT ONLY → REMOVE AFTER BOUNDED CUTOVER
MISLEADING NAME/PATH → RENAME/REHOME
```

Do not keep an empty or responsibility-less directory merely because imports once pointed there.

## Winner/Loser elimination

For duplicate/parallel/shadow truth:

```text
SELECT WINNER
→ INVENTORY LOSER WRITERS/READERS/CONSUMERS
→ MIGRATE
→ CUT OVER
→ DISABLE LOSER WRITES
→ ZERO LOSER READERS
→ DELETE LOSER FILES/DIRECTORIES/PACKAGES/CONFIG/CONTRACTS/MANUAL MODELS
→ REMOVE IMPORTS/EXPORTS/ROUTES/DEPENDENCIES
→ PROVE ZERO LOSER REACHABILITY
```

`KEEP_BOTH`, permanent mirrors, and keep-in-sync layers are forbidden final states.

## Backend/frontend mirror elimination

When domain/contract semantics are canonical, eliminate manual cross-layer mirrors that restate the same business truth:

`manual DTO | manual enum | manual status map | manual permission map | manual allowed-action map | manual validation/default | direct generated repair | frontend business-state copy`.

Canonical treatment:

`DOMAIN SEMANTICS → CONTRACT → REGENERATE WHERE APPLICABLE → MIGRATE CONSUMERS → DELETE MIRROR → ZERO OLD REFERENCES`.

Presentation-only transformations may remain when they are truly derived and do not claim business authority.

## Screen / route / frontend-flow finishing

Every affected screen/route/flow must prove:

```text
REQUIRED_CAPABILITY_JOURNEY
REQUIRED_ACTOR
CANONICAL_BACKEND_SUPPORT_OR_VALID_FRONTEND_ONLY_PURPOSE
CANONICAL_API_CONTRACT_BINDING_WHERE_APPLICABLE
CANONICAL_QUERY_MUTATION_STORE
NO_HARDCODED_OR_MOCKED_BUSINESS_TRUTH_HIDING_A_GAP
NO_DUPLICATE_SCREEN/FLOW_WITH_SAME_RESPONSIBILITY
REQUIRED_LOADING_SUCCESS_EMPTY_ERROR_RETRY_AUTH_OFFLINE_STATES
REQUIRED_USER_ACTION_TO_MUTATION_TO_READBACK_CHAIN
```

If no current capability/journey requires the screen and deletion is low-risk: `DELETE_NOW`.

If duplicate: `SELECT WINNER → MIGRATE NAVIGATION/CONSUMERS → DELETE LOSER`.

If required but backend/contract support is missing: `ROOT_OPEN`; do not mask with local fake truth.

## Compatibility is exceptional

`COMPATIBILITY=FORBIDDEN_BY_DEFAULT`.

It may remain only with proven unavoidable live consumer, exact owner/consumers, no second mutable writer, explicit cutover condition, explicit removal trigger, and bounded lifetime.

Otherwise: `MIGRATE NOW → DELETE NOW`.

## File/symbol/line finishing pass

Every file materially touched by a Closure Unit receives a finishing pass for:

```text
DEAD_SYMBOLS=0
UNUSED_EXPORTS=0
DUPLICATE_LOCAL_SEMANTICS=0
SHADOW_LOCAL_POLICY=0
OBSOLETE_BRANCHES=0
UNNECESSARY_WRAPPERS=0
STALE_FEATURE_FLAGS=0_OR_PROVEN
UNJUSTIFIED_SUPPRESSIONS=0
STALE_TODO_FIXME_HACK=0
MISLEADING_SYMBOL_NAMES=0
DUPLICATE_DEFAULTS_VALIDATIONS_MAPPINGS=0
```

Do not perform style churn unrelated to structure/correctness. Do remove real residue at line/symbol level.

## Heightened `core/**` and `shared/**` finishing

For every affected artifact there re-prove why it is truly cross-cutting. Domain/business truth without a cross-cutting justification must be rehomed to its true owner. Generic buckets must not hide ownership.

## `infra/**`, `tools/**`, `.github/**`, scripts/workflows/config

Treat these as first-class architecture. Delete dead or duplicate runtime/config/tooling authorities, obsolete scripts, stale automation, parallel environment truth, manual mirrors, duplicate generated repair, and unused workflows/dependencies.

## No cosmetic cleanup

Forbidden outcomes:

`legacy → archive`, `old → history`, `duplicate → common`, `multiple truths → shared`, `misc → utils`, `two authorities → wrapper around both`, `missing backend → frontend mock presented as real`, `contract drift → local manual type repair`.

Correct cleanup fixes ownership, restores the canonical vertical chain, and deletes the losing structure.

## Noise hit disposition

Search affected cones and final branch for materially suspicious terms/patterns such as:

`old | legacy | obsolete | deprecated | superseded | archive | backup | copy | tmp | temp | v2 | v3 | compat | fallback | mirror | shadow | duplicate | prototype | experimental | mock | hardcoded | TODO | FIXME | HACK | ts-ignore | eslint-disable | keep in sync`.

A hit is not automatic deletion, but every material hit must be classified `KEEP_PROVEN`, transformed, or deleted. No unclassified material hit remains.

## Deletion suspicion

If a root corrects duplication/replacement/ownership/parity yet removes zero old writer/path/file/directory/wrapper/manual mirror/orphan artifact, trigger:

`CLOSURE_SUSPICION → RE-AUDIT FOR ADDITIVE PATCHING OR UNRESOLVED PARITY`.

## Per-root elimination proof

Before closure answer:

```text
WHAT_GARBAGE_WAS_DELETE_NOW?
WHAT_OLD_AUTHORITY_DISAPPEARED?
WHAT_DUPLICATE_WRITER/READER/MAPPING/MANUAL_MIRROR_DISAPPEARED?
WHAT_FILES_DIRECTORIES_PACKAGES_DISAPPEARED?
WHAT_ORPHAN_SCREENS_ROUTES_ENDPOINTS_BINDINGS_DATA_ARTIFACTS_DISAPPEARED?
WHAT_SCRIPTS_WORKFLOWS_CONFIG_DEPENDENCIES_DISAPPEARED?
WHAT_LINE/SYMBOL_RESIDUE_DISAPPEARED?
WHICH_NAMES_PATHS_BOUNDARIES_ARE_NOW_CANONICAL?
WHAT_PROVES_OLD_REFERENCES=0?
WHAT_PROVES_REQUIRED_VERTICAL_SLICES_ARE_CONTINUOUS?
WHAT_COMPATIBILITY_REMAINS, WHY, AND WHAT REMOVES_IT?
WHAT_PROVES_NO_THIRD_AUTHORITY?
```

`ROOT FIXED + MATERIAL RESIDUE = ROOT OPEN`.
