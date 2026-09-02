# 03 — ROOT SELECTION AND CANONICAL RECONSTRUCTION EXECUTION

## Purpose

Collapse the complete branch-wide structural and end-to-end parity delta into the highest proven causal roots, then execute one causally complete reconstruction unit at a time.

`03` is entered only after `01`, `02`, and `02A` complete the tracked-tree census, Current/Canonical models, Artifact Ledger, Semantic Authority Registry, Directory/Package Verdicts, Winner/Loser Map, Structural Delta, and Cross-Layer Capability Matrix.

## Root synthesis law

Do not create one root per bug/file/test/finding/parity break. Cluster deltas under their highest causal parents and prefer the root that removes the most structural causes with the smallest causally complete target.

Rank by:

`CAUSAL DEPTH × BLOCKING POWER × CANONICAL IMPORTANCE × PRODUCT/DATA/SECURITY/FINANCIAL RISK × FANOUT × STRUCTURAL LEVERAGE × EXECUTABLE PROOF`.

Historical findings and CI/scanner failures remain evidence only.

## Structural rewrite escalation

If one responsibility shows three or more of:

`duplicate owners | duplicate writers | duplicate mappings | wrappers/adapters | parallel directories | conflicting defaults | multiple config sources | duplicated state logic | generated/manual repairs | backend/frontend semantic drift | frontend local business truth | orphan required screen/API/binding | repeated patches | compatibility layers`,

classify it as `POTENTIAL_STRUCTURAL_ROOT` and stop local descendant patching until the structural diagnosis is complete.

## Selected Closure Unit record

Before mutation record:

```text
PINNED_REMOTE_G_SHA=
PRIMARY_CAUSAL_ROOT=
WHY_HIGHEST=
ACTUAL_SOURCE_OF_DEFECT=
ACTUAL_SOURCE_OF_FIX=
CANONICAL_RESPONSIBILITY=
CANONICAL_OWNER=
CANONICAL_WRITER=
TARGET_CANONICAL_NAME_PATH_BOUNDARY=
COMPLETE_AFFECTED_CONE=
AFFECTED_CAPABILITIES_JOURNEYS=
E2E_VERTICAL_SLICES=
CURRENT_PARITY_GAPS=
TARGET_PARITY_STATE=
WINNING_AUTHORITIES=
LOSING_AUTHORITIES=
LOSING_WRITERS_READERS_CONSUMERS=
ARTIFACT_DISPOSITIONS_TO_REALIZE=
DIRECTORY_PACKAGE_VERDICTS_TO_REALIZE=
DATA_SCHEMA_IMPACT=
BACKEND_SERVICE_USE_CASE_IMPACT=
API_EVENT_IMPACT=
CONTRACT_GENERATED_IMPACT=
FRONTEND_DATA_VIEWMODEL_IMPACT=
COMPONENT_SCREEN_ROUTE_IMPACT=
USER_ACTION_MUTATION_READBACK_IMPACT=
RUNTIME_CONFIG_TOOLING_IMPACT=
TEST_FIXTURE_MOCK_DEPENDENCY_IMPACT=
MIGRATION_BACKFILL_RECONCILIATION=
CUTOVER=
DELETE_NOW_TARGETS=
POST_CUTOVER_DELETION_TARGETS=
OLD_NAMES_PATHS_TO_DELETE=
NEGATIVE_SPACE_SEARCH=
FILE_LEVEL_FINISHING_SCOPE=
TARGETED_VERIFICATION=
CI_VERIFICATION_MODE=INCREMENTAL|FULL_SCOPE
GITHUB_ACTIONS_RUN_REQUIRED=YES|NO|ON_DEMAND
GITHUB_ACTIONS_WORKFLOW=ci-check|ci-backends|security-remote|sonarqube|final-closure|NONE
GITHUB_ACTIONS_DISPATCH_PARAMS=
GITHUB_ACTIONS_AWAIT_MODE=BLOCKING|ASYNC|NOT_REQUIRED
REOPEN_CONDITIONS=
```

Blank or stale fields block execution.

## Root-correct treatment order

```text
CANONICAL PRODUCT/DOMAIN SEMANTICS
→ CANONICAL OWNER/WRITER
→ TARGET NAME/PATH/BOUNDARY
→ DELETE_NOW LOW-RISK GARBAGE IN AFFECTED CONE
→ DATA/SCHEMA/STORAGE TRUTH
→ BACKEND SERVICE / USE CASE
→ API / EVENT / COMMAND
→ CANONICAL CONTRACT
→ GENERATED BINDING
→ FRONTEND DATA CONSUMERS / QUERY / MUTATION / STORE
→ VIEW MODEL / COMPONENT / SCREEN / ROUTE
→ USER ACTION / MUTATION
→ PERSISTED READBACK / VISIBLE FINAL STATE
→ RUNTIME/CONFIG/TOOLING
→ MIGRATION/BACKFILL/RECONCILIATION
→ CUTOVER
→ DISABLE OLD WRITERS
→ ZERO OLD READERS/REFERENCES
→ DELETE LOSING AUTHORITIES AND MANUAL MIRRORS
→ DELETE OLD FILES/DIRECTORIES/PACKAGES/PATHS
→ FILE/SYMBOL/LINE FINISHING
→ DIRECTORY/PACKAGE FINISHING
→ END-TO-END PARITY VERIFY
→ FALSIFY
→ DISPATCH ON-DEMAND GITHUB ACTIONS RUN WHEN REQUIRED (BLOCKING OR ASYNC)
→ INGEST RUN EVIDENCE
```

No minimal-diff requirement exists.

## Fast-delete lane inside execution

Any affected-cone artifact already classified `DELETE_NOW` is removed without a separate migration project. Required proof is limited to its low-risk classification plus quick all-consumer/reference/reachability check.

Do not postpone proven garbage to a later cleanup batch.

`PROVEN_GARBAGE_DISCOVERED_IN_EXECUTING_CONE → DELETE_IN_SAME_CLOSURE_UNIT`.

## Winner/Loser enforcement

For every duplicated authority in the root:

`WINNER CANONICALIZED → LOSER CONSUMERS MIGRATED → CUTOVER → LOSER WRITES DISABLED → LOSER DELETED → ZERO LOSER REFERENCES`.

`LOSING_AUTHORITY_SURVIVES_AFTER_CUTOVER=ROOT_OPEN`.

Never create a third wrapper/mapper/registry to preserve two competing authorities.

Manual frontend/backend DTO/enum/status/business-rule mirrors participate in this rule when they duplicate canonical contract/domain semantics.

## Vertical parity enforcement

A product root is not closed merely because backend tests and frontend builds pass independently.

Require all applicable checks from `02A`:

```text
DATABASE_TO_BACKEND_PARITY=PASS_OR_NA
BACKEND_TO_API_PARITY=PASS_OR_NA
API_TO_CONTRACT_PARITY=PASS_OR_NA
CONTRACT_TO_GENERATED_PARITY=PASS_OR_NA
GENERATED_TO_FRONTEND_PARITY=PASS_OR_NA
FRONTEND_TO_SCREEN_PARITY=PASS_OR_NA
SCREEN_ACTION_TO_MUTATION_PARITY=PASS_OR_NA
MUTATION_TO_PERSISTED_READBACK=PASS_OR_NA
VISIBLE_FINAL_STATE_PARITY=PASS_OR_NA
ERROR_STATE_PARITY=PASS_OR_NA
AUTH_PERMISSION_PARITY=PASS_OR_NA
STATE_TRANSITION_PARITY=PASS_OR_NA
MANUAL_PARALLEL_DTO=0
MANUAL_PARALLEL_ENUM=0
MANUAL_PARALLEL_BUSINESS_MAPPING=0
FRONTEND_SHADOW_BUSINESS_TRUTH=0
BACKEND_SHADOW_BUSINESS_TRUTH=0
ORPHAN_REQUIRED_ENDPOINTS=0
ORPHAN_REQUIRED_SCREENS=0
ORPHAN_REQUIRED_BINDINGS=0
ORPHAN_REQUIRED_DB_TRUTH=0
UNRESOLVED_E2E_PARITY_GAPS=0
```

## No preservation bias

Do not retain an old internal API, package, directory, wrapper, adapter, route, screen, script, test, config, manual frontend model, manual generated repair, or orphan endpoint merely to reduce churn. If the canonical target makes it unnecessary, migrate required consumers and remove it.

## Root closure gate

```text
CANONICAL_OWNER_PROOF=PASS
CANONICAL_WRITER_PROOF=PASS_OR_NA
COMPLETE_CONSUMER_MIGRATION=PASS
ARTIFACT_DISPOSITIONS_REALIZED=PASS
DIRECTORY_PACKAGE_VERDICTS_REALIZED=PASS
WINNER_LOSER_CUTOVER=PASS_OR_NA
END_TO_END_PARITY=PASS_OR_NA
DATA_MIGRATION_READBACK=PASS_OR_NA
CONTRACT_GENERATED_PARITY=PASS_OR_NA
OLD_WRITERS=0
OLD_READERS=0
OLD_IMPORTS_REEXPORTS=0
OLD_ROUTES_CONFIG_SCRIPT_WORKFLOW_REFS=0
OLD_NAME_PATH_REFS=0
OLD_RUNTIME_REACHABILITY=0
LOSING_AUTHORITIES_REMAINING=0
SUPERSEDED_STRUCTURE_DELETED=YES
UNBOUNDED_COMPATIBILITY=0
THIRD_AUTHORITY=0
FILE_LEVEL_FINISHING=PASS
DIRECTORY_PACKAGE_FINISHING=PASS
TARGETED_VERIFICATION=PASS
NEGATIVE_SPACE=PASS
AFFECTED_CONE_EVIDENCE_DEBT=0
```

A structural replacement/duplication/parity root that removes no losing structure/manual mirror or reconnects no broken required chain triggers mandatory `CLOSURE_SUSPICION` and re-audit before closure.

## Exact-HEAD lock

Immediately before commit/push require:

`EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA`.

If false: `FETCH → COMPARE → INVALIDATE → RE-PIN → RE-DIAGNOSE → REAPPLY ONLY IF STILL VALID`.

Never force-push unseen work.
